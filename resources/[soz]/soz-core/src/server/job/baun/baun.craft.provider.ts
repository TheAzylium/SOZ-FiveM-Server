import { ItemService } from '@public/server/item/item.service';

import { OnEvent } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { ServerEvent } from '../../../shared/event';
import { InventoryItem } from '../../../shared/item';
import { InventoryManager } from '../../inventory/inventory.manager';
import { Notifier } from '../../notifier';

@Provider()
export class BaunCraftProvider {
    @Inject(InventoryManager)
    private inventoryManager: InventoryManager;

    @Inject(ItemService)
    private item: ItemService;

    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(ItemService)
    private itemService: ItemService;

    @OnEvent(ServerEvent.BAUN_CREATE_COCKTAIL_BOX)
    public craftCocktailBox(source: number) {
        let remaining = 10;

        const toRemove: { item: InventoryItem; amount: number }[] = [];

        for (const inventoryItem of this.inventoryManager.getItems(source)) {
            if (inventoryItem.type !== 'cocktail') {
                continue;
            }

            if (inventoryItem.amount <= 0) {
                continue;
            }

            if (this.item.isItemExpired(inventoryItem)) {
                continue;
            }

            const removeAmount = Math.min(inventoryItem.amount, remaining);
            remaining -= removeAmount;

            toRemove.push({
                item: inventoryItem,
                amount: removeAmount,
            });

            if (remaining <= 0) {
                break;
            }
        }

        if (remaining > 0) {
            this.notifier.notify(source, `Vous devez avoir au moins 10 cocktails pour créer une caisse.`, 'error');

            return;
        }

        if (
            !this.inventoryManager.canSwapItems(
                source,
                toRemove.map(remove => {
                    return {
                        name: remove.item.name,
                        amount: remove.amount,
                        metadata: remove.item.metadata,
                    };
                }),
                [
                    {
                        name: 'cocktail_box',
                        amount: 1,
                        metadata: {},
                    },
                ]
            )
        ) {
            this.notifier.notify(source, `Vous n'avez pas assez de place dans votre inventaire.`, 'error');

            return;
        }

        for (const remove of toRemove) {
            this.inventoryManager.removeInventoryItem(source, remove.item, remove.amount);
        }

        this.inventoryManager.addItemToInventory(source, 'cocktail_box', 1);

        this.notifier.notify(source, `Vous avez créé un assortiment de cocktails.`, 'success');
    }

    @OnEvent(ServerEvent.BAUN_ICE_CUBE)
    public onIceCube(source: number, count: number) {
        if (!count) {
            this.notifier.notify(source, 'Une erreur est survenue lors du choix de la quantité.', 'error');
            return;
        }

        const iceCount = count * 6;

        if (
            !this.inventoryManager.canSwapItems(
                source,
                [{ name: 'ice_cube', amount: iceCount, metadata: null }],
                [{ name: 'water_bottle', amount: count, metadata: null }]
            )
        ) {
            this.notifier.notify(source, 'Vos poches sont pleines.', 'error');
            return;
        }

        const dstItem = this.itemService.getItem('ice_cube');
        const secItem = this.itemService.getItem('water_bottle');

        if (!this.inventoryManager.removeNotExpiredItem(source, 'water_bottle', count)) {
            this.notifier.notify(source, `Vous n'avez pas assez de ${secItem.label}.`, 'error');
            return;
        }
        this.inventoryManager.addItemToInventory(source, 'ice_cube', iceCount);

        this.notifier.notify(
            source,
            `Vous avez fait ~g~${iceCount}~s~ ${dstItem.label} avec ~g~${count}~s~ ${secItem.label}.`
        );
    }
}
