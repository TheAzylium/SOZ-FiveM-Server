import { OnEvent, OnGameEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';
import { Tick, TickInterval } from '@core/decorators/tick';

import { ClientEvent, GameEvent, ServerEvent } from '../../shared/event';
import { TrainingWeapons } from '../../shared/weapons/weapon';
import { PlayerService } from '../player/player.service';

// Training weapons have their own dedicated weapons.meta hash (resources/[weapon]/soz-weapon-
// assaultsmg-training), so a hit from one is unambiguous — no need to check who's shooting.
const trainingWeaponHashes = TrainingWeapons.map(name => GetHashKey(name));

// This provider captures the real HP/armor loss a training hit deals the instant it happens,
// cancels it (so the player never really loses HP/armor), and reports the captured value to the
// server, which replays it on a purely virtual plates -> armor -> health counter (see
// server/weapon/training.weapon.provider.ts).
@Provider()
export class TrainingWeaponProvider {
    @Inject(PlayerService)
    private playerService: PlayerService;

    private lastKnownHealth = 0;
    private lastKnownArmour = 0;

    @Tick(TickInterval.EVERY_FRAME)
    public trackHealthSnapshot() {
        const playerPed = PlayerPedId();
        this.lastKnownHealth = GetEntityHealth(playerPed);
        this.lastKnownArmour = GetPedArmour(playerPed);
    }

    @OnGameEvent(GameEvent.CEventNetworkEntityDamage)
    public onTrainingWeaponHit(
        victim: number,
        attacker: number,
        unkInt1: number,
        unkBool1: number,
        unkBool2: number,
        isFatal: boolean,
        weaponHash: number
    ) {
        const playerPed = PlayerPedId();
        if (victim !== playerPed || !trainingWeaponHashes.includes(weaponHash)) {
            return;
        }

        const healthAfter = GetEntityHealth(playerPed);
        const armourAfter = GetPedArmour(playerPed);
        const healthLost = Math.max(0, this.lastKnownHealth - healthAfter);
        const armourLost = Math.max(0, this.lastKnownArmour - armourAfter);

        if (healthAfter !== this.lastKnownHealth) {
            SetEntityHealth(playerPed, this.lastKnownHealth);
        }
        if (armourAfter !== this.lastKnownArmour) {
            SetPedArmour(playerPed, this.lastKnownArmour);
        }

        let damage = healthLost + armourLost;
        if (damage <= 0) {
            return;
        }

        // Real armor plates leave the global 90% damage reduction (SetPlayerWeaponDefenseModifier)
        // active even though we never touch the player's real plate count for this weapon, so the
        // captured value would otherwise be 10x too low while real plates are still equipped.
        if (this.playerService.getState().nbArmorPlates > 0) {
            damage *= 10;
        }

        TriggerServerEvent(ServerEvent.TRAINING_WEAPON_HIT, damage);
    }

    @OnEvent(ClientEvent.TRAINING_WEAPON_DOWN)
    public onTrainingWeaponDown(durationMs: number) {
        const playerPed = PlayerPedId();
        SetPedToRagdoll(playerPed, durationMs, durationMs, 0, false, false, false);
    }
}
