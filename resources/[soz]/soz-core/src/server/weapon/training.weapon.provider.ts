import { OnEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';

import { ClientEvent, ServerEvent } from '../../shared/event';
import { Notifier } from '../notifier';
import { TrainingSessionService } from './training.session.service';

// Receives the real (captured then cancelled) damage reported by the victim's own client
// (see client/weapon/training.weapon.provider.ts) and replays it on a virtual per-victim
// plates -> armor -> health counter (TrainingSessionService), putting the victim in the "coma"
// pose (client/weapon/training.watch.provider.ts) once it would reach 0 — no automatic recovery,
// only "se relever" on the watch gets them back up. Only has any effect on a victim with an
// active tactical watch — applyHit() ignores hits on anyone else.
@Provider()
export class TrainingWeaponProvider {
    @Inject(TrainingSessionService)
    private sessionService: TrainingSessionService;

    @Inject(Notifier)
    private notifier: Notifier;

    @OnEvent(ServerEvent.TRAINING_WEAPON_HIT)
    public onTrainingWeaponHit(source: number, damage: number, weaponHash: number) {
        const result = this.sessionService.applyHit(source, damage, weaponHash);
        if (!result) {
            return;
        }

        if (result.downed) {
            this.notifier.notify(source, 'Vous êtes hors de combat.', 'error');
            TriggerClientEvent(ClientEvent.TRAINING_WEAPON_DOWN, source);
            return;
        }

        TriggerClientEvent(ClientEvent.TACTICAL_WATCH_SYNC, source, this.sessionService.getSnapshot(source));
    }
}
