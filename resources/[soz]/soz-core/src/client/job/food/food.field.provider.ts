import { DrugSkill } from '@private/shared/drugs';

import { Once, OnceStep } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { ClientEvent } from '../../../shared/event/client';
import { ServerEvent } from '../../../shared/event/server';
import { JobPermission, JobType } from '../../../shared/job';
import { FoodFields, FoodFieldType } from '../../../shared/job/food';
import { PolygonZone } from '../../../shared/polyzone/polygon.zone';
import { PlayerService } from '../../player/player.service';
import { TargetFactory } from '../../target/target.factory';
import { JobService } from '../job.service';

@Provider()
export class FoodFieldProvider {
    @Inject(TargetFactory)
    private targetFactory: TargetFactory;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(JobService)
    private jobService: JobService;

    @Once(OnceStep.PlayerLoaded)
    public setupFoodFields() {
        for (const type of Object.keys(FoodFields)) {
            const field = FoodFields[type as FoodFieldType];

            for (const index in field.zones) {
                const zone = field.zones[index];
                const minZ = zone.reduce((acc, zone) => Math.min(acc, zone[2]), 9999);
                const maxZ = zone.reduce((acc, zone) => Math.max(acc, zone[2]), -9999);
                const polygone = new PolygonZone<any>(zone, { minZ, maxZ });
                const id = `food-field-${type}-${index}`;

                this.targetFactory.createForPolygoneZone(id, polygone, [
                    {
                        label: 'Récolter',
                        color: 'food',
                        icon: 'c:food/collecter.png',
                        blackoutGlobal: true,
                        blackoutJob: JobType.Food,
                        job: JobType.Food,
                        canInteract: entity => {
                            const player = this.playerService.getPlayer();

                            if (!player) {
                                return false;
                            }

                            if (!this.jobService.hasPermission(JobType.Food, JobPermission.FoodHarvest)) {
                                return false;
                            }

                            if (IsEntityAVehicle(entity)) {
                                return false;
                            }

                            if (IsEntityAPed(entity)) {
                                return false;
                            }

                            return player.job.onduty;
                        },
                        action: () => {
                            this.collectIngredients(type as FoodFieldType, index);
                        },
                    },
                    {
                        label: 'Récolter de la Zeed',
                        color: 'crimi',
                        icon: 'c:crimi/zeed.png',
                        canInteract: entity => {
                            if (IsEntityAVehicle(entity)) {
                                return false;
                            }

                            if (IsEntityAPed(entity)) {
                                return false;
                            }

                            return this.playerService.hasDrugSkill(DrugSkill.Botaniste);
                        },
                        action: this.harvestZeed.bind(this),
                    },
                ]);
            }
        }

        this.targetFactory.createForBoxZone(
            'food_milk_harvest',
            {
                center: [2416.83, 4994.29, 46.5],
                length: 1,
                width: 5.0,
                heading: 133.3,
                minZ: 45.5,
                maxZ: 49.5,
            },
            [
                {
                    label: 'Récupérer',
                    color: 'food',
                    icon: 'c:food/collecter.png',
                    blackoutGlobal: true,
                    blackoutJob: JobType.Food,
                    job: JobType.Food,
                    canInteract: () => {
                        const player = this.playerService.getPlayer();

                        if (!player) {
                            return false;
                        }

                        return player.job.onduty;
                    },
                    action: this.harvestMilk.bind(this),
                },
            ]
        );
    }

    public async collectIngredients(type: FoodFieldType, index: string) {
        if (IsPedInAnyVehicle(PlayerPedId(), false)) {
            return;
        }

        TriggerServerEvent(ServerEvent.FOOD_COLLECT, type, index);
    }

    public harvestZeed() {
        TriggerEvent(ClientEvent.DRUGS_HARVEST_ZEED, { location: 'food' });
    }

    public harvestMilk() {
        if (IsPedInAnyVehicle(PlayerPedId(), false)) {
            return;
        }

        TriggerServerEvent(ServerEvent.FOOD_MILK_COLLECT, GetClockHours());
    }
}
