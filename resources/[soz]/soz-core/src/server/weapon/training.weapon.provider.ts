import { On, OnEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';

import { ClientEvent, ServerEvent } from '../../shared/event';
import { TrainingWeaponConfig } from '../../shared/weapons/weapon';
import { PlayerService } from '../player/player.service';
import { PlayerStateService } from '../player/player.state.service';

type FakeCombatSession = {
    platesLeft: number;
    armorLeft: number;
    healthLeft: number;
    lastHitAt: number;
};

// Receives the real (captured then cancelled) damage reported by the victim's own client
// (see client/weapon/training.weapon.provider.ts) and replays it on a virtual per-victim
// plates -> armor -> health counter, ragdolling the victim once it would reach 0.
@Provider()
export class TrainingWeaponProvider {
    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(PlayerStateService)
    private playerStateService: PlayerStateService;

    private sessions = new Map<number, FakeCombatSession>();

    @OnEvent(ServerEvent.TRAINING_WEAPON_HIT)
    public onTrainingWeaponHit(source: number, damage: number) {
        if (!damage || damage <= 0) {
            return;
        }

        const targetData = this.playerService.getPlayer(source);
        if (!targetData) {
            return;
        }

        let session = this.sessions.get(source);
        if (!session || Date.now() - session.lastHitAt > TrainingWeaponConfig.sessionTimeoutMs) {
            session = {
                platesLeft: this.playerStateService.getClientState(source)?.nbArmorPlates ?? 0,
                armorLeft: targetData.metadata.armor.current,
                healthLeft: targetData.metadata.health,
                lastHitAt: Date.now(),
            };
        }

        if (session.platesLeft > 0) {
            session.platesLeft -= 1;
        } else if (session.armorLeft > 0) {
            session.armorLeft = Math.max(0, session.armorLeft - damage);
        } else {
            session.healthLeft = Math.max(0, session.healthLeft - damage);
        }
        session.lastHitAt = Date.now();

        if (session.healthLeft <= 0) {
            this.sessions.delete(source);
            TriggerClientEvent(ClientEvent.TRAINING_WEAPON_DOWN, source, TrainingWeaponConfig.ragdollDurationMs);
            return;
        }

        this.sessions.set(source, session);
    }

    @On('playerDropped')
    public onPlayerDropped(source: number) {
        this.sessions.delete(source);
    }
}
