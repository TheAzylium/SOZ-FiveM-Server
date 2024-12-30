import { Once } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { StudioEnterZone, StudioExitZone } from '../../../shared/job/news';
import { PlayerPositionProvider } from '../../player/player.position.provider';

@Provider()
export class NewsProvider {
    @Inject(PlayerPositionProvider)
    private playerPositionProvider: PlayerPositionProvider;

    @Once()
    public onStartNews() {
        this.playerPositionProvider.registerZone(StudioEnterZone, [-1021.57, -91.34, -98.4, 350.16]);
        this.playerPositionProvider.registerZone(StudioExitZone, [-839.36, -231.5, 36.22, 298.32]);
    }
}
