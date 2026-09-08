import { On, OnEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Rpc } from '../../core/decorators/rpc';
import { ClientEvent, ServerEvent } from '../../shared/event';
import { InventoryItem } from '../../shared/inventory';
import { PlayerData } from '../../shared/player';
import { RpcServerEvent } from '../../shared/rpc';
import { BackWeaponSync, PlayerBackWeapons, Weapons, WeaponsType } from '../../shared/weapons/weapon';
import { Inventory } from '../inventory/inventory';
import { InventoryFactory } from '../inventory/inventory.factory';
import { PlayerService } from '../player/player.service';
import { PlayerStateService } from '../player/player.state.service';

const MAX_BACK_WEAPONS = 6;
const BROADCAST_MAX_BYTES = 16 * 1024;

@Provider()
export class WeaponDrawingProvider {
    @Inject(InventoryFactory)
    private inventoryFactory: InventoryFactory;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(PlayerStateService)
    private playerStateService: PlayerStateService;

    private states = new Map<number, PlayerBackWeapons>();

    private subscriptions = new Map<number, { inventory: Inventory; id: string }>();

    @OnEvent(ServerEvent.PLAYER_LOADED, false)
    public async onPlayerLoaded(source: number) {
        const inventory = await this.inventoryFactory.getPlayerInventory(source);

        if (!inventory || this.subscriptions.has(source)) {
            return;
        }

        const id = inventory.subscribe(() => this.refresh(source));

        this.subscriptions.set(source, { inventory, id });

        this.refresh(source);
    }

    @On('QBCore:Server:PlayerUpdate', false)
    public onPlayerUpdate(player: PlayerData) {
        this.refresh(player.source);
    }

    @OnEvent(ServerEvent.PLAYER_UPDATE_STATE)
    public onPlayerStateUpdate(source: number) {
        this.refresh(source);
    }

    @On('QBCore:Server:PlayerUnload', false)
    public onPlayerUnload(source: number) {
        this.forget(source);
    }

    @On('playerDropped')
    public onPlayerDropped(source: number) {
        this.forget(source);
    }

    @Rpc(RpcServerEvent.WEAPON_GET_BACK_DRAW)
    public getBackDraw(): Record<number, PlayerBackWeapons> {
        return Object.fromEntries(this.states);
    }

    private forget(source: number) {
        const subscription = this.subscriptions.get(source);

        if (subscription) {
            subscription.inventory.unsubscribe(subscription.id);
            this.subscriptions.delete(source);
        }

        if (this.states.delete(source)) {
            TriggerLatentClientEvent(ClientEvent.WEAPON_UPDATE_BACK_DRAW, -1, BROADCAST_MAX_BYTES, source, null);
        }
    }

    private refresh(source: number) {
        const subscription = this.subscriptions.get(source);
        const player = this.playerService.getPlayer(source);

        if (!subscription || !player) {
            return;
        }

        const inGameHub = this.playerStateService.getClientState(source)?.isInGameHub;

        const state: PlayerBackWeapons = {
            swat: player.metadata?.cloth_type === 'SWAT',
            weapons: inGameHub ? [] : this.collect(subscription.inventory.items()),
        };

        const previous = this.states.get(source);

        if (previous && JSON.stringify(previous) === JSON.stringify(state)) {
            return;
        }

        this.states.set(source, state);

        TriggerLatentClientEvent(ClientEvent.WEAPON_UPDATE_BACK_DRAW, -1, BROADCAST_MAX_BYTES, source, state);
    }

    private collect(items: Record<number, Readonly<InventoryItem>>): BackWeaponSync[] {
        return Object.values(items)
            .filter(item => item.type === 'weapon' && Weapons[item.name.toUpperCase()]?.drawPositionInfo)
            .slice(0, MAX_BACK_WEAPONS)
            .map(item => {
                const components = Object.values(item.metadata?.attachments ?? {})
                    .filter(attachment => !!attachment)
                    .map(attachment => String(attachment));

                return {
                    name: item.name.toUpperCase() as WeaponsType,
                    tint: item.metadata?.tint,
                    components: components.length > 0 ? components : undefined,
                };
            });
    }
}
