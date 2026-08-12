import { PhoneBoothLocations } from '../../config/phone-booth';
import { Command } from '../../core/decorators/command';
import { Once, OnceStep, OnEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Tick } from '../../core/decorators/tick';
import { SozRole } from '../../core/permissions';
import { emitRpc } from '../../core/rpc';
import { wait } from '../../core/utils';
import { ClientEvent } from '../../shared/event/client';
import { AskInput, ValidateInput } from '../../shared/nui/input';
import {
    HANDSET_ANIM_PROFILE,
    HANDSET_EXIT_ANIM_FLAGS,
    HANDSET_INTRO_ANIM_FLAGS,
    HANDSET_PLAYER_OFFSET,
    HANDSET_PROP_ANIM_NAME,
    HandsetAnimProfile,
    PHONE_BOOTH_BILLING_INTERVAL,
    PHONE_BOOTH_MODEL,
    PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL,
    PhoneBooth,
    RING_HEAR_RADIUS,
    VANILLA_PHONE_BOOTH_MODELS,
    VANILLA_PHONE_BOOTH_SEARCH_RADIUS,
} from '../../shared/phone-booth';
import { Vector3 } from '../../shared/polyzone/vector';
import { Err, isErr, Ok, Result } from '../../shared/result';
import { RpcServerEvent } from '../../shared/rpc';
import { TargetOption } from '../../shared/target';
import { TaxType } from '../../shared/tax';
import { ClipboardService } from '../clipboard.service';
import { Notifier } from '../notifier';
import { InputService } from '../nui/input.service';
import { ObjectProvider } from '../object/object.provider';
import { PlayerService } from '../player/player.service';
import { ResourceLoader } from '../repository/resource.loader';
import { TaxRepository } from '../repository/tax.repository';
import { PhoneState } from './phone.state';

type PickupResult = {
    number: string;
    connected: boolean;
};

const PhoneNumberValidator: ValidateInput<string> = (input: string) => {
    const trimmed = input?.trim() ?? '';

    if (/^\d{4}$/.test(trimmed)) {
        return Ok(`555-${trimmed}`);
    }

    if (!/^\d{3}-\d{4}$/.test(trimmed)) {
        return Err('Le numéro doit être au format XXXX ou 555-XXXX');
    }

    return Ok(trimmed);
};

const BoothErrorMessage: Record<string, string> = {
    occupied: 'Ce combiné est déjà utilisé.',
    'unknown-booth': 'Cette cabine est indisponible.',
    unavailable: 'Ce numéro ne répond pas.',
    busy: 'La ligne est occupée.',
    'not-enough-cash': "Vous n'avez pas assez d'argent sur vous.",
    'not-attached': 'Vous devez décrocher le combiné avant de composer.',
};

@Provider()
export class PhoneBoothProvider {
    @Inject(ObjectProvider)
    private objectProvider: ObjectProvider;

    @Inject(ResourceLoader)
    private resourceLoader: ResourceLoader;

    @Inject(InputService)
    private inputService: InputService;

    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(ClipboardService)
    private clipboard: ClipboardService;

    @Inject(TaxRepository)
    private taxRepository: TaxRepository;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(PhoneState)
    private phoneState: PhoneState;

    private attachedBooth: string | null = null;
    private hangingUp = false;

    private scriptedProp: number | null = null;
    private handsetAnimProfile: HandsetAnimProfile | null = null;
    private ringbackSoundId: number | null = null;

    private boothEntities = new Map<string, number>();
    private ringingBooths = new Set<string>();
    private ringingNearby = false;

    @Once(OnceStep.PlayerLoaded)
    public async spawnBooths() {
        const model = GetHashKey(PHONE_BOOTH_MODEL);

        const taxedPrice = this.taxRepository.getPriceWithTax(PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL, TaxType.SERVICE);
        const priceLabel = `${taxedPrice}$/${PHONE_BOOTH_BILLING_INTERVAL / 1000}sec`;

        for (const booth of Object.values(PhoneBoothLocations)) {
            const targets: TargetOption[] = [
                {
                    label: 'Appeler',
                    subLabel: priceLabel,
                    category: 'citizen',
                    canInteract: () => this.attachedBooth === null && !this.ringingBooths.has(booth.number),
                    action: (entity: number) => this.pickup(booth, entity),
                    distance: 1,
                },
                {
                    label: 'Décrocher',
                    subLabel: priceLabel,
                    category: 'citizen',
                    canInteract: () => this.attachedBooth === null && this.ringingBooths.has(booth.number),
                    action: (entity: number) => this.pickup(booth, entity),
                    distance: 1,
                },
                {
                    label: 'Raccrocher',
                    category: 'citizen',
                    canInteract: () => this.attachedBooth === booth.number,
                    action: () => this.hangup(),
                    distance: 1,
                },
            ];

            const id = `phone_booth_${booth.number}`;

            await this.objectProvider.createObject(
                {
                    id,
                    model,
                    position: booth.coords,
                    permanent: true,
                },
                targets,
            );

            const entity = this.objectProvider.getEntityFromId(id);
            if (entity) {
                this.boothEntities.set(booth.number, entity);
            }
        }
    }

    @Tick(2000)
    private hideOverlappingVanillaBooths() {
        for (const booth of Object.values(PhoneBoothLocations)) {
            const ownEntity = this.boothEntities.get(booth.number);

            for (const modelName of VANILLA_PHONE_BOOTH_MODELS) {
                const overlapping = GetClosestObjectOfType(
                    booth.coords[0],
                    booth.coords[1],
                    booth.coords[2],
                    1.0,
                    GetHashKey(modelName),
                    false,
                    false,
                    false,
                );

                if (overlapping && overlapping !== ownEntity && DoesEntityExist(overlapping)) {
                    SetEntityVisible(overlapping, false, false);
                    SetEntityCollision(overlapping, false, false);
                }
            }
        }
    }

    @Command('pb_pos', {
        role: ['admin', 'staff'] as SozRole[],
        description: 'Copie une entrée PhoneBoothLocations pour la position actuelle',
    })
    public async copyBoothPosition(): Promise<void> {
        const [isAllowed] = await emitRpc<[boolean, string]>(RpcServerEvent.ADMIN_IS_ALLOWED);
        if (!isAllowed) {
            return;
        }

        const playerPed = PlayerPedId();
        const playerCoords = GetEntityCoords(playerPed, true) as Vector3;

        let coords = playerCoords;
        let heading = GetEntityHeading(playerPed);
        let matchedModel: string | null = null;

        for (const modelName of VANILLA_PHONE_BOOTH_MODELS) {
            const existing = GetClosestObjectOfType(
                playerCoords[0],
                playerCoords[1],
                playerCoords[2],
                VANILLA_PHONE_BOOTH_SEARCH_RADIUS,
                GetHashKey(modelName),
                false,
                false,
                false,
            );

            if (existing && DoesEntityExist(existing)) {
                coords = GetEntityCoords(existing, true) as Vector3;
                heading = GetEntityHeading(existing);
                matchedModel = modelName;
                break;
            }
        }

        const usedNumbers = new Set(Object.values(PhoneBoothLocations).map((booth) => booth.number));
        let number: string;
        do {
            number = `888-${Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, '0')}`;
        } while (usedNumbers.has(number));

        const zoneId = GetNameOfZone(coords[0], coords[1], coords[2]);
        const zoneLabel = zoneId ? GetLabelText(zoneId) : '';
        const name = zoneLabel && zoneLabel !== 'NULL' ? zoneLabel : '';
        const key = `booth_${(zoneId || number).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

        const snippet =
            `    ${key}: { number: '${number}', ` +
            `coords: [${coords[0].toFixed(2)}, ${coords[1].toFixed(2)}, ${coords[2].toFixed(2)}, ${heading.toFixed(
                2,
            )}], name: '${name}' },`;

        this.clipboard.copy(snippet);
        this.notifier.notify(
            matchedModel ? `Copié : ${key} (calé sur ${matchedModel} existant)` : `Copié : ${key}`,
            'success',
        );
    }

    private async pickup(booth: PhoneBooth, entity: number) {
        TaskTurnPedToFaceEntity(PlayerPedId(), entity, 500);
        await wait(500);

        const result = await emitRpc<Result<PickupResult, string>>(RpcServerEvent.PHONE_BOOTH_PICKUP, booth.number);

        if (isErr(result)) {
            this.notifier.notify(BoothErrorMessage[result.err] ?? 'Une erreur est survenue.', 'error');
            return;
        }

        this.attachedBooth = booth.number;
        this.phoneState.setAttachedToBooth(true);

        if (result.ok.connected) {
            await this.connectHandset(entity);
            this.notifier.notify('Appel décroché.', 'success');
            return;
        }

        const targetNumber = await this.inputService.askInput<string>(
            { title: 'Numéro à composer (XXXX ou 555-XXXX)', maxCharacters: 8 } as AskInput,
            PhoneNumberValidator,
        );

        if (!targetNumber) {
            await this.hangup();
            return;
        }

        const callResult = await emitRpc<Result<boolean, string>>(
            RpcServerEvent.PHONE_BOOTH_CALL,
            booth.number,
            targetNumber,
        );

        if (isErr(callResult)) {
            this.notifier.notify(BoothErrorMessage[callResult.err] ?? 'Une erreur est survenue.', 'error');
            await this.hangup();
            return;
        }

        await this.connectHandset(entity);
        this.startRingback();
        this.notifier.notify('Ça sonne...', 'info');
    }

    private startRingback() {
        if (this.ringbackSoundId !== null) {
            return;
        }

        const soundId = GetSoundId();
        PlaySoundFrontend(soundId, 'Remote_Ring', 'Phone_SoundSet_Michael', true);
        this.ringbackSoundId = soundId;
    }

    private stopRingback() {
        if (this.ringbackSoundId === null) {
            return;
        }

        StopSound(this.ringbackSoundId);
        ReleaseSoundId(this.ringbackSoundId);
        this.ringbackSoundId = null;
    }

    @OnEvent(ClientEvent.VOIP_VOICE_START_CALL)
    private onVoiceCallStart() {
        this.stopRingback();
    }

    private async connectHandset(entity: number) {
        SetEntityVisible(entity, false, false);

        const model = GetHashKey(PHONE_BOOTH_MODEL);
        await this.resourceLoader.loadModel(model);

        const coords = GetEntityCoords(entity) as Vector3;
        const heading = GetEntityHeading(entity);

        this.scriptedProp = CreateObjectNoOffset(model, coords[0], coords[1], coords[2], true, true, true);
        SetEntityHeading(this.scriptedProp, heading);
        SetEntityCompletelyDisableCollision(this.scriptedProp, false, false);
        this.resourceLoader.unloadModel(model);

        const playerPed = PlayerPedId();
        const offset = GetOffsetFromEntityInWorldCoords(entity, ...HANDSET_PLAYER_OFFSET) as Vector3;
        SetEntityCoords(playerPed, offset[0], offset[1], offset[2], false, false, false, false);
        SetEntityHeading(playerPed, heading);

        await this.resourceLoader.loadAnimationDictionary(HANDSET_ANIM_PROFILE.dictionary);

        PlayEntityAnim(
            this.scriptedProp,
            HANDSET_PROP_ANIM_NAME,
            HANDSET_ANIM_PROFILE.dictionary,
            10.0,
            true,
            true,
            true,
            0.0,
            0,
        );
        TaskPlayAnim(
            playerPed,
            HANDSET_ANIM_PROFILE.dictionary,
            HANDSET_ANIM_PROFILE.introAnim,
            8.0,
            8.0,
            -1,
            HANDSET_INTRO_ANIM_FLAGS,
            0,
            false,
            false,
            false,
        );

        this.handsetAnimProfile = HANDSET_ANIM_PROFILE;
    }

    @Tick(250)
    private onHandsetAnimationTick() {
        if (this.attachedBooth && !this.playerService.canDoAction()) {
            void this.hangup();
            return;
        }

        if (!this.scriptedProp || !this.handsetAnimProfile) {
            return;
        }

        const playerPed = PlayerPedId();
        const profile = this.handsetAnimProfile;

        if (IsEntityPlayingAnim(playerPed, profile.dictionary, profile.introAnim, 3)) {
            return;
        }

        TaskPlayAnim(
            playerPed,
            profile.dictionary,
            profile.introAnim,
            8.0,
            8.0,
            -1,
            HANDSET_INTRO_ANIM_FLAGS,
            0,
            false,
            false,
            false,
        );
    }

    private async disconnectHandset(entity: number | null) {
        this.stopRingback();

        const prop = this.scriptedProp;
        const profile = this.handsetAnimProfile;

        if (!prop) {
            return;
        }

        this.scriptedProp = null;
        this.handsetAnimProfile = null;

        const playerPed = PlayerPedId();

        if (profile) {
            TaskPlayAnim(
                playerPed,
                profile.dictionary,
                profile.exitAnim,
                8.0,
                8.0,
                -1,
                HANDSET_EXIT_ANIM_FLAGS,
                0,
                false,
                false,
                false,
            );
        }

        await wait(200);

        if (profile) {
            StopEntityAnim(prop, HANDSET_PROP_ANIM_NAME, profile.dictionary, 1000.0);
            StopAnimTask(playerPed, profile.dictionary, profile.introAnim, 1.0);
        }

        await wait(2800);

        ClearPedTasks(playerPed);
        DeleteEntity(prop);

        if (entity) {
            SetEntityVisible(entity, true, false);
        }
    }

    private async hangup() {
        const boothNumber = this.attachedBooth;
        if (!boothNumber || this.hangingUp) {
            return;
        }

        this.hangingUp = true;
        this.attachedBooth = null;
        this.phoneState.setAttachedToBooth(false);

        await this.disconnectHandset(this.boothEntities.get(boothNumber) ?? null);
        await emitRpc(RpcServerEvent.PHONE_BOOTH_HANGUP, boothNumber);

        this.hangingUp = false;
    }

    @OnEvent(ClientEvent.PHONE_BOOTH_FORCE_HANGUP)
    private async onForceHangup(boothNumber: string) {
        if (this.attachedBooth !== boothNumber) {
            return;
        }

        this.attachedBooth = null;
        this.phoneState.setAttachedToBooth(false);
        await this.disconnectHandset(this.boothEntities.get(boothNumber) ?? null);
    }

    @OnEvent(ClientEvent.VOIP_VOICE_END_CALL)
    private async onVoiceCallEnd() {
        if (this.attachedBooth) {
            await this.hangup();
        }
    }

    @OnEvent(ClientEvent.PHONE_BOOTH_RING_START)
    private onRingStart(boothNumber: string) {
        if (this.ringingBooths.has(boothNumber) || !this.boothEntities.has(boothNumber)) {
            return;
        }

        this.ringingBooths.add(boothNumber);
    }

    @Tick(1000)
    private ringingProximityCheck() {
        if (this.ringingBooths.size === 0) {
            if (this.ringingNearby) {
                StopPedRingtone(PlayerPedId());
                this.ringingNearby = false;
            }
            return;
        }

        const playerPed = PlayerPedId();
        const playerCoords = GetEntityCoords(playerPed, true) as Vector3;

        let isNear = false;
        for (const boothNumber of this.ringingBooths) {
            const entity = this.boothEntities.get(boothNumber);
            if (!entity) {
                continue;
            }

            const boothCoords = GetEntityCoords(entity, true) as Vector3;
            const distance = Math.hypot(
                boothCoords[0] - playerCoords[0],
                boothCoords[1] - playerCoords[1],
                boothCoords[2] - playerCoords[2],
            );

            if (distance <= RING_HEAR_RADIUS) {
                isNear = true;
                break;
            }
        }

        if (isNear && !this.ringingNearby) {
            PlayPedRingtone('Remote_Ring', playerPed, true);
            this.ringingNearby = true;
        } else if (!isNear && this.ringingNearby) {
            StopPedRingtone(playerPed);
            this.ringingNearby = false;
        }
    }

    @OnEvent(ClientEvent.PHONE_BOOTH_RING_STOP)
    private onRingStop(boothNumber: string) {
        if (!this.ringingBooths.has(boothNumber)) {
            return;
        }

        this.ringingBooths.delete(boothNumber);

        if (this.ringingBooths.size === 0 && this.ringingNearby) {
            StopPedRingtone(PlayerPedId());
            this.ringingNearby = false;
        }
    }
}