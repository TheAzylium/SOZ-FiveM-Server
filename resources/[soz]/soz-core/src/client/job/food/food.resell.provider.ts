import { Once, OnceStep } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { BoxZone } from '../../../shared/polyzone/box.zone';
import { PedFactory } from '../../factory/ped.factory';
import { PlayerInOutService } from '../../player/player.inout.service';

@Provider()
export class FoodResellProvider {
    @Inject(PedFactory)
    private pedFactory: PedFactory;

    @Inject(PlayerInOutService)
    private playerInOutService: PlayerInOutService;

    @Once(OnceStep.PlayerLoaded)
    public setupFoodResell() {
        this.pedFactory.createPedOnGrid({
            model: 's_m_y_dockwork_01',
            coords: { x: -57.01, y: -2448.4, z: 6.24, w: 145.77 },
            freeze: true,
            invincible: true,
            blockevents: true,
            scenario: 'WORLD_HUMAN_CLIPBOARD',
        });

        this.playerInOutService.add(
            'Resell:LSPort:Food',
            new BoxZone([-57.01, -2448.4, 7.24], 3.0, 3.0, {
                minZ: 5.24,
                maxZ: 9.24,
                heading: 145.77,
            }),
            isInside => {
                if (isInside) {
                    TriggerEvent('player/setCurrentResellZone', {
                        ZoneName: 'Resell:LSPort:Food',
                        SourceAccount: 'farm_food',
                        TargetAccount: 'safe_food',
                    });
                } else {
                    TriggerEvent('player/setCurrentResellZone', null);
                }
            }
        );
    }
}
