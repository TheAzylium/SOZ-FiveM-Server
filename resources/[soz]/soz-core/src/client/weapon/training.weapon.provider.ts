import { OnGameEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';
import { Tick, TickInterval } from '@core/decorators/tick';

import { GameEvent, ServerEvent } from '../../shared/event';
import { Vector3 } from '../../shared/polyzone/vector';
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

        // A hit whose real damage would zero out (or the engine already flags as fatal) starts the
        // real death sequence natively before this handler even runs — restoring health alone isn't
        // enough to undo that. Resurrect in place first (same trick as the real LSMC death/coma
        // recovery, client/job/lsmc/lsmc.death.provider.ts), then reapply the exact pre-hit
        // health/armour below so the player ends up exactly where they were, not healed to full.
        if (isFatal || healthAfter <= 0) {
            const coords = GetEntityCoords(playerPed, false) as Vector3;
            const heading = GetEntityHeading(playerPed);
            NetworkResurrectLocalPlayer(coords[0], coords[1], coords[2], heading, 1, false);
            ClearPedTasksImmediately(playerPed);
            console.log('[TrainingWeapon][client] fatal hit detected, resurrected in place before reverting');
        }

        if (healthAfter !== this.lastKnownHealth) {
            SetEntityHealth(playerPed, this.lastKnownHealth);
        }
        if (armourAfter !== this.lastKnownArmour) {
            SetPedArmour(playerPed, this.lastKnownArmour);
        }

        let damage = healthLost + armourLost;

        console.log(
            `[TrainingWeapon][client] hit captured — healthBefore=${this.lastKnownHealth} healthAfter=${healthAfter} healthLost=${healthLost} | armourBefore=${this.lastKnownArmour} armourAfter=${armourAfter} armourLost=${armourLost} | rawDamage=${damage} nbArmorPlates=${this.playerService.getState().nbArmorPlates}`
        );

        if (damage <= 0) {
            console.log('[TrainingWeapon][client] damage <= 0, not reporting to server');
            return;
        }

        // Real armor plates leave the global 90% damage reduction (SetPlayerWeaponDefenseModifier)
        // active even though we never touch the player's real plate count for this weapon, so the
        // captured value would otherwise be 10x too low while real plates are still equipped.
        if (this.playerService.getState().nbArmorPlates > 0) {
            damage *= 10;
            console.log(`[TrainingWeapon][client] real plates equipped, compensated damage x10 -> ${damage}`);
        }

        console.log(`[TrainingWeapon][client] reporting damage=${damage} to server`);
        TriggerServerEvent(ServerEvent.TRAINING_WEAPON_HIT, damage, weaponHash);
    }
}
