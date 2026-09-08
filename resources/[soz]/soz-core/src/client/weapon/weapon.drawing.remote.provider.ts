import { Once, OnceStep, OnEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';
import { Tick, TickInterval } from '@core/decorators/tick';
import { emitRpc } from '@core/rpc';

import { ClientEvent } from '../../shared/event';
import { RpcServerEvent } from '../../shared/rpc';
import {
    BackWeaponSync,
    DrawPositions,
    DrawPositionsWithShield,
    PlayerBackWeapons,
    WeaponConfig,
    Weapons,
} from '../../shared/weapons/weapon';
import { AttachedObjectService } from '../object/attached.object.service';

type RenderedEntry = {
    main: number;
    extras: number[];
    hash: number;
};

type RenderedPlayer = {
    signature: string;
    entries: RenderedEntry[];
};

const SPINE3_BONE = 24816;

@Provider()
export class WeaponDrawingRemoteProvider {
    @Inject(AttachedObjectService)
    private attachedObjectService: AttachedObjectService;

    private states = new Map<number, PlayerBackWeapons>();

    private rendered = new Map<number, RenderedPlayer>();

    @Once(OnceStep.PlayerLoaded, true)
    public async onPlayerLoaded() {
        const snapshot = await emitRpc<Record<number, PlayerBackWeapons>>(RpcServerEvent.WEAPON_GET_BACK_DRAW);

        for (const [source, state] of Object.entries(snapshot ?? {})) {
            this.states.set(Number(source), state);
        }
    }

    @OnEvent(ClientEvent.WEAPON_UPDATE_BACK_DRAW)
    public onUpdate(source: number, state: PlayerBackWeapons | null) {
        if (state === null) {
            this.states.delete(source);
        } else {
            this.states.set(source, state);
        }
    }

    @Tick(TickInterval.EVERY_SECOND)
    public async reconcile() {
        const localPlayer = PlayerId();
        const activePlayers = new Set<number>(GetActivePlayers());

        for (const player of [...this.rendered.keys()]) {
            if (!activePlayers.has(player)) {
                this.clearPlayer(player);
            }
        }

        for (const player of activePlayers) {
            if (player === localPlayer) {
                continue;
            }

            const ped = GetPlayerPed(player);

            if (!ped || !DoesEntityExist(ped)) {
                continue;
            }

            const state = this.states.get(GetPlayerServerId(player));

            if (!state || state.weapons.length === 0) {
                this.clearPlayer(player);
                continue;
            }

            const signature = JSON.stringify(state);
            let current = this.rendered.get(player);

            if (!current || current.signature !== signature) {
                if (current) {
                    this.detachRendered(current);
                }

                current = {
                    signature,
                    entries: await this.renderWeapons(ped, state),
                };

                this.rendered.set(player, current);
            }

            this.updateVisibility(ped, current.entries);
        }
    }

    private async renderWeapons(ped: number, state: PlayerBackWeapons): Promise<RenderedEntry[]> {
        const rendered: RenderedEntry[] = [];
        const drawPosition = state.swat ? DrawPositionsWithShield : DrawPositions;

        for (const weapon of state.weapons) {
            const config: WeaponConfig = Weapons[weapon.name];

            if (!config?.drawPositionInfo) {
                continue;
            }

            const hash = GetHashKey(weapon.name);
            const position = drawPosition[config.drawPositionInfo.type];

            const main = await this.attachedObjectService.attachObjectToPlayer({
                ped,
                bone: SPINE3_BONE,
                model: config.drawPositionInfo.model,
                position: position.position,
                rotation: position.rotation,
                rotationOrder: 2,
                weaponHash: hash,
                tint: weapon.tint,
                weaponComponents: this.toComponentHashes(weapon),
            });

            const extras: number[] = [];

            if (main) {
                for (const extra of config.extaDraw ?? []) {
                    const extraObject = await this.attachedObjectService.attachObjectToPlayer({
                        ped,
                        bone: GetEntityBoneIndexByName(main, extra.bone),
                        model: extra.model,
                        position: [0, 0, 0],
                        rotation: [0, 0, 0],
                        rotationOrder: 2,
                        entity: main,
                        skipNetworking: true,
                    });

                    if (extraObject) {
                        extras.push(extraObject);
                    }
                }
            }

            rendered.push({ main: main ?? 0, extras, hash });
        }

        return rendered;
    }

    private toComponentHashes(weapon: BackWeaponSync): number[] | undefined {
        if (!weapon.components || weapon.components.length === 0) {
            return undefined;
        }

        return weapon.components.map(component => GetHashKey(component));
    }

    private updateVisibility(ped: number, rendered: RenderedEntry[]) {
        const heldWeapon = GetSelectedPedWeapon(ped);
        const inVehicle = this.isHiddenByVehicle(ped);

        for (const entry of rendered) {
            const visible = !inVehicle && entry.hash !== heldWeapon;

            if (entry.main) {
                SetEntityVisible(entry.main, visible, false);
            }

            entry.extras.forEach(object => SetEntityVisible(object, visible, false));
        }
    }

    private isHiddenByVehicle(ped: number): boolean {
        const vehicle = GetVehiclePedIsIn(ped, false);

        if (!vehicle) {
            return false;
        }

        return !IsThisModelABike(GetEntityModel(vehicle));
    }

    private clearPlayer(player: number) {
        const current = this.rendered.get(player);

        if (current) {
            this.detachRendered(current);
        }

        this.rendered.delete(player);
    }

    private detachRendered(rendered: RenderedPlayer) {
        for (const entry of rendered.entries) {
            entry.extras.forEach(object => this.attachedObjectService.detachObjectToPlayer(object));

            if (entry.main) {
                this.attachedObjectService.detachObjectToPlayer(entry.main);
            }
        }
    }

    @Once(OnceStep.Stop)
    public async stop() {
        for (const player of [...this.rendered.keys()]) {
            this.clearPlayer(player);
        }
    }
}
