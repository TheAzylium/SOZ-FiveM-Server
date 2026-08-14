import { On } from '@core/decorators/event';
import { Provider } from '@core/decorators/provider';
import { joaat } from '@public/shared/joaat';

import {
    TrainingWatchConfig,
    TrainingWatchLoadout,
    TrainingWatchSnapshot,
    TrainingWeaponMaxDamage,
    TrainingWeapons,
} from '../../shared/weapons/weapon';

type FakeCombatSession = {
    platesLeft: number;
    armorLeft: number;
    healthLeft: number;
};

export type TrainingHitResult = {
    downed: boolean;
};

const DEFAULT_WATCH_LOADOUT: TrainingWatchLoadout = {
    armor: TrainingWatchConfig.armorOn,
    plates: TrainingWatchConfig.maxPlates,
};

// The client-victim's reported damage is declarative/trusted (see docs/core/training-weapon-
// system.md, "Points d'attention" #1) — this maps each training weapon's hash to its real-damage
// sanity ceiling (TrainingWeaponMaxDamage) so applyHit() can clamp obviously-impossible values
// instead of trusting them outright.
const maxDamageByHash = new Map<number, number>(
    TrainingWeapons.filter(name => TrainingWeaponMaxDamage[name] !== undefined).map(name => [
        joaat(name),
        TrainingWeaponMaxDamage[name],
    ])
);

// Owns the per-victim fake-combat state used by the training weapon system (see
// docs/core/training-weapon-system.md): a purely virtual plates -> armor -> health counter,
// never touching the player's real stats. Shared between TrainingWeaponProvider (damage capture
// from the training P90) and TrainingWatchProvider (the "tactical watch" item that lets a
// participant drive/inspect their own session). The training weapon only has an effect on
// players who have an active tactical watch — without one, hits are ignored entirely.
@Provider()
export class TrainingSessionService {
    private sessions = new Map<number, FakeCombatSession>();
    private watchLoadouts = new Map<number, TrainingWatchLoadout>();
    private activeWatchUsers = new Set<number>();

    private getLoadout(source: number): TrainingWatchLoadout {
        return this.watchLoadouts.get(source) ?? DEFAULT_WATCH_LOADOUT;
    }

    private createSession(source: number): FakeCombatSession {
        const loadout = this.getLoadout(source);
        console.log(
            `[TrainingWeapon][server] new session for source=${source} — platesLeft=${loadout.plates} armorLeft=${loadout.armor} healthLeft=${TrainingWatchConfig.fullHealth} (fixed, watch sessions always start full)`
        );

        return {
            platesLeft: loadout.plates,
            armorLeft: loadout.armor,
            healthLeft: TrainingWatchConfig.fullHealth,
        };
    }

    public applyHit(source: number, damage: number, weaponHash: number): TrainingHitResult | null {
        console.log(`[TrainingWeapon][server] received hit from source=${source} damage=${damage}`);

        if (!damage || damage <= 0) {
            console.log('[TrainingWeapon][server] ignored, damage <= 0');
            return null;
        }

        const maxDamage = maxDamageByHash.get(weaponHash);
        if (maxDamage !== undefined && damage > maxDamage) {
            console.log(
                `[TrainingWeapon][server] reported damage=${damage} exceeds sanity ceiling=${maxDamage} for weaponHash=${weaponHash}, clamping`
            );
            damage = maxDamage;
        }

        if (!this.activeWatchUsers.has(source)) {
            console.log(`[TrainingWeapon][server] ignored, source=${source} has no active tactical watch`);
            return null;
        }

        // No timeout/expiration: a session only ever restarts via an explicit action on the watch
        // (activate/reset), not from being left alone for a while.
        let session = this.sessions.get(source);
        if (!session) {
            session = this.createSession(source);
        } else {
            console.log(
                `[TrainingWeapon][server] reusing session for source=${source} — platesLeft=${session.platesLeft} armorLeft=${session.armorLeft} healthLeft=${session.healthLeft}`
            );
        }

        // A plate absorbs a whole hit regardless of its damage (matches the real armor-plate
        // system), but armor only absorbs up to what it has left — any damage past that carries
        // over to health in this same hit, instead of being silently discarded.
        if (session.platesLeft > 0) {
            session.platesLeft -= 1;
            console.log(`[TrainingWeapon][server] branch=plates — platesLeft now ${session.platesLeft}`);
        } else {
            let remainingDamage = damage;

            if (session.armorLeft > 0) {
                const before = session.armorLeft;
                const absorbed = Math.min(session.armorLeft, remainingDamage);
                session.armorLeft -= absorbed;
                remainingDamage -= absorbed;
                console.log(
                    `[TrainingWeapon][server] branch=armor — armorLeft ${before} -> ${session.armorLeft} (absorbed=${absorbed}, overflow=${remainingDamage})`
                );
            }

            if (remainingDamage > 0) {
                const before = session.healthLeft;
                session.healthLeft = Math.max(0, session.healthLeft - remainingDamage);
                console.log(
                    `[TrainingWeapon][server] branch=health — healthLeft ${before} -> ${session.healthLeft} (damage=${remainingDamage})`
                );
            }
        }

        if (session.healthLeft <= 0) {
            console.log(`[TrainingWeapon][server] source=${source} healthLeft <= 0, triggering ragdoll`);
            this.sessions.delete(source);
            return { downed: true };
        }

        this.sessions.set(source, session);
        return { downed: false };
    }

    public activate(source: number): TrainingWatchSnapshot {
        this.activeWatchUsers.add(source);
        if (!this.sessions.has(source)) {
            this.sessions.set(source, this.createSession(source));
        }

        return this.getSnapshot(source);
    }

    public setLoadout(source: number, armor: number, plates: number): TrainingWatchSnapshot {
        const clampedPlates = Math.max(0, Math.min(TrainingWatchConfig.maxPlates, Math.trunc(plates)));
        const loadout: TrainingWatchLoadout = {
            armor: armor >= TrainingWatchConfig.armorOn ? TrainingWatchConfig.armorOn : 0,
            plates: clampedPlates,
        };
        this.watchLoadouts.set(source, loadout);

        const session = this.sessions.get(source) ?? this.createSession(source);
        session.armorLeft = loadout.armor;
        session.platesLeft = loadout.plates;
        this.sessions.set(source, session);

        return this.getSnapshot(source);
    }

    // Same "no session, or session drained" criterion already used by getUp() to seed a fresh
    // session — lets callers (e.g. reset()) tell whether a player is currently in the coma pose
    // without duplicating that logic.
    public isDown(source: number): boolean {
        const session = this.sessions.get(source);
        return !session || session.healthLeft <= 0;
    }

    public reset(source: number): TrainingWatchSnapshot {
        const loadout = this.getLoadout(source);

        this.sessions.set(source, {
            healthLeft: TrainingWatchConfig.fullHealth,
            armorLeft: loadout.armor,
            platesLeft: loadout.plates,
        });

        return this.getSnapshot(source);
    }

    // Called when the watch leaves the player's inventory (dropped, traded, given away, ...): the
    // fake-combat session ends and the loadout memory is wiped, so getting the item back later
    // starts fresh rather than resuming a stale session.
    public deactivate(source: number): TrainingWatchSnapshot {
        this.activeWatchUsers.delete(source);
        this.sessions.delete(source);
        this.watchLoadouts.delete(source);

        return this.getSnapshot(source);
    }

    public getUp(source: number): TrainingWatchSnapshot {
        const session = this.sessions.get(source);

        // Getting up only ever touches health. By the time health hits 0 the session is deleted
        // (see applyHit) with armor/plates already at 0 — that's the state to resume from here,
        // not the watch's loadout (that would wrongly hand back full armor for free).
        if (!session || session.healthLeft <= 0) {
            this.sessions.set(source, {
                healthLeft: TrainingWatchConfig.getUpMinHealth,
                armorLeft: 0,
                platesLeft: 0,
            });
        } else {
            session.healthLeft = Math.max(session.healthLeft, TrainingWatchConfig.getUpMinHealth);
            this.sessions.set(source, session);
        }

        return this.getSnapshot(source);
    }

    public getSnapshot(source: number): TrainingWatchSnapshot {
        const isWatchActive = this.activeWatchUsers.has(source);
        const session = this.sessions.get(source);

        const health = session?.healthLeft ?? (isWatchActive ? TrainingWatchConfig.fullHealth : 0);

        return {
            active: isWatchActive,
            health,
            maxHealth: TrainingWatchConfig.fullHealth,
            armor: session?.armorLeft ?? 0,
            maxArmor: TrainingWatchConfig.armorOn,
            plates: session?.platesLeft ?? 0,
            maxPlates: TrainingWatchConfig.maxPlates,
        };
    }

    @On('playerDropped')
    public onPlayerDropped(source: number) {
        this.sessions.delete(source);
        this.watchLoadouts.delete(source);
        this.activeWatchUsers.delete(source);
    }
}
