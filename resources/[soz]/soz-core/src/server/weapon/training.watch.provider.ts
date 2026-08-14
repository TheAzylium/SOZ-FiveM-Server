import { Once, OnEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';

import { ClientEvent, ServerEvent } from '../../shared/event';
import { ItemService } from '../item/item.service';
import { TrainingSessionService } from './training.session.service';

// A player mashing the menu (or a modified client spamming these events directly) shouldn't be
// able to fire watch actions faster than the menu UI could ever produce them.
const ACTION_COOLDOWN_MS = 500;

// "Tactical watch" item (resources/[qb]/qb-core/shared/items.lua: tactical_watch): lets a
// training participant activate/drive their own fake-combat session (TrainingSessionService)
// from their inventory, without needing a real vest/plates equipped. See
// docs/core/training-weapon-system.md for the full picture.
@Provider()
export class TrainingWatchProvider {
    @Inject(ItemService)
    private item: ItemService;

    @Inject(TrainingSessionService)
    private sessionService: TrainingSessionService;

    private lastActionAt = new Map<number, number>();

    @Once()
    public onStart() {
        this.item.setItemUseCallback('tactical_watch', (source: number) => {
            const snapshot = this.sessionService.activate(source);
            TriggerClientEvent(ClientEvent.TACTICAL_WATCH_USE, source, snapshot);
        });
    }

    private isOnCooldown(source: number): boolean {
        const now = Date.now();
        const last = this.lastActionAt.get(source) ?? 0;
        if (now - last < ACTION_COOLDOWN_MS) {
            return true;
        }

        this.lastActionAt.set(source, now);
        return false;
    }

    @OnEvent(ServerEvent.TACTICAL_WATCH_SET_LOADOUT)
    public onSetLoadout(source: number, armor: number, plates: number) {
        if (this.isOnCooldown(source)) {
            return;
        }

        const snapshot = this.sessionService.setLoadout(source, armor, plates);
        TriggerClientEvent(ClientEvent.TACTICAL_WATCH_SYNC, source, snapshot);
    }

    @OnEvent(ServerEvent.TACTICAL_WATCH_RESET)
    public onReset(source: number) {
        if (this.isOnCooldown(source)) {
            return;
        }

        // Reset always restores full virtual health, so a player who was down is no longer down
        // afterwards — checked before reset() overwrites the session, since STAND_UP also stops
        // whatever animation is currently playing and shouldn't fire for someone who wasn't down.
        const wasDown = this.sessionService.isDown(source);

        const snapshot = this.sessionService.reset(source);
        TriggerClientEvent(ClientEvent.TACTICAL_WATCH_SYNC, source, snapshot);

        if (wasDown) {
            TriggerClientEvent(ClientEvent.TACTICAL_WATCH_STAND_UP, source);
        }
    }

    @OnEvent(ServerEvent.TACTICAL_WATCH_GET_UP)
    public onGetUp(source: number) {
        if (this.isOnCooldown(source)) {
            return;
        }

        const snapshot = this.sessionService.getUp(source);
        TriggerClientEvent(ClientEvent.TACTICAL_WATCH_SYNC, source, snapshot);
        TriggerClientEvent(ClientEvent.TACTICAL_WATCH_STAND_UP, source);
    }

    // Reported by the client when the watch leaves the player's inventory (see
    // client/weapon/training.watch.provider.ts) so the fake-combat session ends and the HUD gauges
    // disappear, instead of lingering after the item is gone.
    @OnEvent(ServerEvent.TACTICAL_WATCH_DEACTIVATE)
    public onDeactivate(source: number) {
        const snapshot = this.sessionService.deactivate(source);
        TriggerClientEvent(ClientEvent.TACTICAL_WATCH_SYNC, source, snapshot);
    }
}
