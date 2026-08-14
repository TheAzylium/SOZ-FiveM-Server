import { OnEvent, OnNuiEvent } from '@core/decorators/event';
import { Inject } from '@core/decorators/injectable';
import { Provider } from '@core/decorators/provider';
import { Tick, TickInterval } from '@core/decorators/tick';
import { PlayerInventoryUpdate } from '@public/core/decorators/player';
import { InventoryItem } from '@public/shared/inventory';
import { deathAnim } from '@public/shared/job/lsmc';

import { ClientEvent, ServerEvent } from '../../shared/event';
import { NuiEvent } from '../../shared/event/nui';
import { MenuType } from '../../shared/nui/menu';
import { TrainingWatchLoadout, TrainingWatchSnapshot } from '../../shared/weapons/weapon';
import { AnimationService } from '../animation/animation.service';
import { NuiDispatch } from '../nui/nui.dispatch';
import { NuiMenu } from '../nui/nui.menu';
import { ProgressService } from '../progress.service';

const TACTICAL_WATCH_ITEM = 'tactical_watch';

// Both delays exist so "se relever"/"réinitialiser" aren't instant no-animation teleports — a
// visible, timed action other players can see happening, same as any other ProgressService use in
// this codebase (crafting, plaster, ...).
const GET_UP_DURATION_MS = 3000;
const RESET_DURATION_MS = 2500;

// Client side of the "tactical watch" item: opens the training menu, keeps the fake HUD gauge
// (nui/components/Hud/components/PlayerStats.tsx) in sync with the server-authoritative session
// (server/weapon/training.session.service.ts), puts the player in the same pose as the real LSMC
// "coma" state (`deathAnim`) instead of a native ragdoll when their virtual health hits 0 — no
// automatic recovery, only "se relever" on the watch gets them back up — and ends the session as
// soon as the watch leaves the inventory (dropped, traded, given away, ...).
@Provider()
export class TrainingWatchProvider {
    @Inject(NuiDispatch)
    private nuiDispatch: NuiDispatch;

    @Inject(NuiMenu)
    private menu: NuiMenu;

    @Inject(AnimationService)
    private animationService: AnimationService;

    @Inject(ProgressService)
    private progressService: ProgressService;

    private loadout: TrainingWatchLoadout = { armor: 100, plates: 6 };

    private active = false;

    private isDown = false;

    // While "se relever"/"réinitialiser" is playing its animation, suspend the coma-pose
    // enforcement below — ProgressService.progress() stops whatever animation is currently
    // running (including deathAnim) to start its own, and without this guard the per-frame tick
    // would immediately fight it and force deathAnim back on.
    private isWatchActionRunning = false;

    @OnEvent(ClientEvent.TACTICAL_WATCH_USE)
    public onUse(snapshot: TrainingWatchSnapshot) {
        this.syncHud(snapshot);

        if (this.menu.getOpened() === MenuType.TacticalWatchMenu) {
            this.menu.closeMenu();
            return;
        }

        this.menu.openMenu(MenuType.TacticalWatchMenu, { snapshot, loadout: this.loadout });
    }

    @OnEvent(ClientEvent.TACTICAL_WATCH_SYNC)
    public onSync(snapshot: TrainingWatchSnapshot) {
        this.syncHud(snapshot);
    }

    @PlayerInventoryUpdate()
    public onInventoryUpdate(items: Record<number, InventoryItem>) {
        if (!this.active) {
            return;
        }

        const stillHasWatch = Object.values(items).some(item => item?.name === TACTICAL_WATCH_ITEM);
        if (stillHasWatch) {
            return;
        }

        this.active = false;
        TriggerServerEvent(ServerEvent.TACTICAL_WATCH_DEACTIVATE);

        if (this.menu.getOpened() === MenuType.TacticalWatchMenu) {
            this.menu.closeMenu();
        }
    }

    @OnEvent(ClientEvent.TRAINING_WEAPON_DOWN)
    public onTrainingWeaponDown() {
        this.isDown = true;
        this.animationService.playAnimation(deathAnim);
    }

    // Same enforcement pattern as the real "coma" state (client/job/lsmc/lsmc.death.provider.ts
    // controlDeathLoop/animationCheck): nothing here actually locks player input, so re-apply the
    // pose every frame in case movement input cancelled it.
    @Tick(TickInterval.EVERY_FRAME)
    public async enforceDownAnimation() {
        if (!this.isDown || this.isWatchActionRunning) {
            return;
        }

        const ped = PlayerPedId();
        if (!IsEntityPlayingAnim(ped, deathAnim.base.dictionary, deathAnim.base.name, 3)) {
            this.animationService.playAnimation(deathAnim);
        }
    }

    @OnEvent(ClientEvent.TACTICAL_WATCH_STAND_UP)
    public onStandUp() {
        this.isDown = false;
        this.animationService.stop();
        ClearPedTasksImmediately(PlayerPedId());
    }

    @OnNuiEvent(NuiEvent.TacticalWatchSetLoadout)
    public async onSetLoadout(loadout: TrainingWatchLoadout) {
        this.loadout = loadout;
        TriggerServerEvent(ServerEvent.TACTICAL_WATCH_SET_LOADOUT, loadout.armor, loadout.plates);
    }

    @OnNuiEvent(NuiEvent.TacticalWatchReset)
    public async onReset() {
        if (this.progressService.isDoingAction()) {
            return;
        }

        this.menu.closeMenu();
        this.isWatchActionRunning = true;

        const { completed } = await this.progressService.progress(
            'tactical_watch_reset',
            'Réinitialisation de la montre tactique...',
            RESET_DURATION_MS,
            {
                dictionary: 'cellphone@',
                name: 'cellphone_text_read_base',
                options: {
                    repeat: true,
                    onlyUpperBody: true,
                },
            }
        );

        this.isWatchActionRunning = false;

        if (!completed) {
            return;
        }

        TriggerServerEvent(ServerEvent.TACTICAL_WATCH_RESET);
    }

    @OnNuiEvent(NuiEvent.TacticalWatchGetUp)
    public async onGetUp() {
        if (this.progressService.isDoingAction()) {
            return;
        }

        this.menu.closeMenu();
        this.isWatchActionRunning = true;

        const { completed } = await this.progressService.progress(
            'tactical_watch_get_up',
            'Vous vous relevez...',
            GET_UP_DURATION_MS,
            {
                dictionary: 'get_up@directional@movement@from_knees@standard',
                name: 'getup_l_0',
                options: {
                    repeat: false,
                },
            }
        );

        this.isWatchActionRunning = false;

        if (!completed) {
            return;
        }

        TriggerServerEvent(ServerEvent.TACTICAL_WATCH_GET_UP);
    }

    private syncHud(snapshot: TrainingWatchSnapshot) {
        this.active = snapshot.active;
        this.nuiDispatch.dispatch('player', 'UpdatePlayerStats', { trainingWatch: snapshot });
    }
}
