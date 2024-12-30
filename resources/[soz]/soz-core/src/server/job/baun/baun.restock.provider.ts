import { OnEvent } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { ServerEvent } from '../../../shared/event/server';
import { InventoryManager } from '../../inventory/inventory.manager';
import { ItemService } from '../../item/item.service';
import { Notifier } from '../../notifier';
import { ProgressService } from '../../player/progress.service';

const RESTOCK_CONFIG: Record<string, { name: string; amount: number }[]> = {
    liquor_crate: [
        { name: 'vodka', amount: 2 },
        { name: 'gin', amount: 2 },
        { name: 'tequila', amount: 2 },
        { name: 'whisky', amount: 2 },
        { name: 'cognac', amount: 2 },
        { name: 'rhum', amount: 2 },
    ],
    flavor_crate: [
        { name: 'green_lemon', amount: 5 },
        { name: 'cane_sugar', amount: 10 },
        { name: 'ananas_juice', amount: 5 },
        { name: 'coconut_milk', amount: 5 },
        { name: 'strawberry_juice', amount: 5 },
        { name: 'orange_juice', amount: 5 },
        { name: 'apple_juice', amount: 5 },
    ],
    furniture_crate: [
        { name: 'straw', amount: 10 },
        { name: 'fruit_slice', amount: 12 },
        { name: 'tumbler', amount: 10 },
    ],
    snack_crate: [
        { name: 'tapas', amount: 10 },
        { name: 'peanuts', amount: 10 },
        { name: 'olives', amount: 10 },
    ],
};

@Provider()
export class BaunRestockProvider {
    @Inject(InventoryManager)
    private inventoryManager: InventoryManager;

    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(ProgressService)
    private progressService: ProgressService;

    @Inject(ItemService)
    private itemService: ItemService;

    @OnEvent(ServerEvent.BAUN_RESTOCK)
    public async onRestock(source: number, { storage, item }: { storage: string; item: string }) {
        const config = RESTOCK_CONFIG[item];

        if (!config) {
            return;
        }

        const itemData = this.itemService.getItem(item);

        if (!this.inventoryManager.hasEnoughItem(source, item, 1, true)) {
            this.notifier.notify(source, `Vous n'avez pas de ${itemData.label}.`, 'error');

            return;
        }

        while (this.inventoryManager.hasEnoughItem(source, item, 1, true)) {
            const { completed } = await this.progressService.progress(
                source,
                'restock',
                'Vous commencez à restocker.',
                4000,
                {
                    dictionary: 'rcmextreme3',
                    name: 'idle',
                    options: {
                        repeat: true,
                    },
                },
                {
                    disableMovement: true,
                    disableCarMovement: true,
                    disableMouse: false,
                    disableCombat: true,
                }
            );

            if (!completed) {
                break;
            }

            if (!this.inventoryManager.hasEnoughItem(source, item, 1, true)) {
                break;
            }

            if (!this.inventoryManager.canCarryItems(storage, config)) {
                this.notifier.notify(source, `Il n'y a pas assez de place pour stocker ${itemData.label}.`, 'error');

                break;
            }

            if (!this.inventoryManager.removeNotExpiredItem(source, item, 1)) {
                break;
            }

            for (const { name, amount } of config) {
                this.inventoryManager.addItemToInventoryNotPlayer(storage, name, amount);
            }
        }

        this.notifier.notify(source, `Vous avez arrêté de restocker ${itemData.label}.`, 'success');
    }
}
