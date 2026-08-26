import { Once, OnceStep, OnEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';
import { ProgressService } from '@public/client/progress.service';
import { BlipType } from '@public/shared/blip';
import { ClientEvent, ServerEvent } from '@public/shared/event';
import { FDO_NO_FBI, JobType } from '@public/shared/job';
import { PositiveNumberValidator } from '@public/shared/nui/input';
import {
    TRAINING_ZONE_FLAG_Z_OFFSET,
    TRAINING_ZONE_MAX_RADIUS,
    TRAINING_ZONE_MIN_RADIUS,
    TrainingZone,
} from '@public/shared/police-training-zone';
import { CylinderZone } from '@public/shared/polyzone/cylinder.zone';
import { Vector3 } from '@public/shared/polyzone/vector';

import { BlipFactory } from '../../blip';
import { Notifier } from '../../notifier';
import { InputService } from '../../nui/input.service';
import { PlayerService } from '../../player/player.service';
import { InteractionProvider } from '../../quick-interaction/interaction.provider';

const zoneMargin = 5.0;
const BLIP_ID_PREFIX = 'training_zone_';
const trainingZoneJobTargets = { [JobType.LSPD]: 0, [JobType.BCSO]: 0, [JobType.SASP]: 0 };

@Provider()
export class PoliceTrainingZoneProvider {
    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(InteractionProvider)
    private interactionProvider: InteractionProvider;

    @Inject(BlipFactory)
    private blipFactory: BlipFactory;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(ProgressService)
    private progressService: ProgressService;

    @Inject(InputService)
    private inputService: InputService;

    private cylinders: CylinderZone[] = [];
    private zones: { [id: string]: TrainingZone } = {};

    @Once(OnceStep.Start)
    public onStart() {
        TriggerServerEvent(ServerEvent.POLICE_TRAINING_ZONE_INIT);
    }

    private async removeFlag(id: string): Promise<void> {
        const { completed } = await this.progressService.progress(
            'remove_object',
            'Démontage du drapeau',
            2500,
            {
                dictionary: 'weapons@first_person@aim_rng@generic@projectile@thermal_charge@',
                name: 'plant_floor',
                options: {
                    onlyUpperBody: true,
                },
            },
            {
                useWhileDead: false,
                canCancel: true,
                disableMovement: true,
                disableCarMovement: true,
                disableMouse: false,
                disableCombat: true,
            }
        );
        if (!completed) {
            return;
        }

        TriggerServerEvent(ServerEvent.POLICE_TRAINING_ZONE_REMOVE, Number(id));
    }

    @OnEvent(ClientEvent.POLICE_TRAINING_ZONE_START_PLACEMENT)
    public async startPlacement() {
        const radius = Math.floor(
            await this.inputService.askInput(
                { title: `Rayon de la zone (entre ${TRAINING_ZONE_MIN_RADIUS} et ${TRAINING_ZONE_MAX_RADIUS} mètres)` },
                PositiveNumberValidator
            )
        );

        if (!radius || radius < TRAINING_ZONE_MIN_RADIUS || radius > TRAINING_ZONE_MAX_RADIUS) {
            this.notifier.notify(
                `Le rayon doit être entre ${TRAINING_ZONE_MIN_RADIUS} et ${TRAINING_ZONE_MAX_RADIUS}.`,
                'error'
            );
            return;
        }

        const position = GetOffsetFromEntityInWorldCoords(PlayerPedId(), 0.0, 1.125, 0.0) as Vector3;
        void this.confirmPlacement(this.getGroundPosition(position), radius);
    }

    @OnEvent(ClientEvent.POLICE_TRAINING_ZONE_SYNC)
    public syncZones(zones: { [id: string]: TrainingZone }) {
        const shouldDisplayBlip = this.shouldDisplayBlip();

        for (const [id, zone] of Object.entries(zones)) {
            if (this.zones[id]) {
                continue;
            }

            this.blipFactory.create(BLIP_ID_PREFIX + id, {
                name: "Zone d'entraînement",
                coords: { x: zone.position[0], y: zone.position[1], z: zone.position[2] },
                radius: zone.radius,
                color: 5,
                sprite: 4,
                type: BlipType.Radius,
                hidden: !shouldDisplayBlip,
            });

            this.interactionProvider.createInteractionForCoords(
                zone.position,
                {
                    label: 'Détruire le drapeau',
                    job: trainingZoneJobTargets,
                    action: () => void this.removeFlag(id),
                },
                1.5,
                2.0,
                id
            );
        }

        for (const id of Object.keys(this.zones)) {
            if (!zones[id]) {
                this.blipFactory.remove(BLIP_ID_PREFIX + id);
                this.interactionProvider.deleteInteraction(id);
            }
        }

        this.zones = zones;
        this.cylinders = Object.values(zones).map(
            zone =>
                new CylinderZone(
                    [zone.position[0], zone.position[1]],
                    zone.radius,
                    zone.position[2] - zoneMargin,
                    zone.position[2] + zoneMargin
                )
        );
    }

    public isInTrainingZone(position: Vector3): boolean {
        return this.cylinders.some(zone => zone.isPointInside(position));
    }

    private shouldDisplayBlip(): boolean {
        const player = this.playerService.getPlayer();
        if (!player) {
            return false;
        }

        return FDO_NO_FBI.includes(player.job?.id) && player.job?.onduty;
    }

    @OnEvent(ClientEvent.JOB_DUTY_CHANGE)
    public onDutyChange(duty: boolean) {
        const job = this.playerService.getPlayer()?.job.id;
        if (!FDO_NO_FBI.includes(job)) {
            return;
        }

        for (const id of Object.keys(this.zones)) {
            this.blipFactory.hide(BLIP_ID_PREFIX + id, !duty);
        }
    }

    private async confirmPlacement(position: Vector3, radius: number): Promise<void> {
        const { completed } = await this.progressService.progress(
            'spawn_object',
            "Installation de la zone d'entraînement",
            2500,
            {
                dictionary: 'anim@narcotics@trash',
                name: 'drop_front',
                options: {
                    onlyUpperBody: true,
                },
            },
            {
                disableMovement: true,
                useWhileDead: false,
                canCancel: true,
                disableCarMovement: true,
                disableMouse: false,
                disableCombat: true,
            }
        );
        if (!completed) {
            return;
        }

        TriggerServerEvent(ServerEvent.POLICE_TRAINING_ZONE_PLACE, position, radius);
    }

    private getGroundPosition(position: Vector3): Vector3 {
        const [found, groundZ] = GetGroundZFor_3dCoord(position[0], position[1], position[2] + 1.0, false);

        return [position[0], position[1], (found ? groundZ : position[2]) + TRAINING_ZONE_FLAG_Z_OFFSET];
    }
}
