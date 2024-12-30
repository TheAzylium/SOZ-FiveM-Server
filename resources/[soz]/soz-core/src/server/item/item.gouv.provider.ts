import { Once } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { ClientEvent } from '../../shared/event';
import { JobType } from '../../shared/job';
import { PlayerService } from '../player/player.service';
import { ItemService } from './item.service';

@Provider()
export class ItemGouvProvider {
    @Inject(ItemService)
    private item: ItemService;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Once()
    public onStartNewsItem() {
        this.item.setItemUseCallback('radar', source => {
            const player = this.playerService.getPlayer(source);

            if (!player) {
                return;
            }

            if (player.job.id !== JobType.Gouv) {
                return;
            }

            TriggerClientEvent(ClientEvent.ITEM_RADAR_USE, source);
        });
    }
}
