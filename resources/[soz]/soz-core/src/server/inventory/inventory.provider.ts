import { OnEvent } from '@public/core/decorators/event';
import { ServerEvent } from '@public/shared/event';

import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Rpc } from '../../core/decorators/rpc';
import { RpcServerEvent } from '../../shared/rpc';
import { ItemService } from '../item/item.service';
import { LockBinService } from '../job/bluebird/lock.bin.service';
import { InventoryManager } from './inventory.manager';

/**
 * Exposition of some methods from the InventoryManager to the clients
 */
@Provider()
export class InventoryProvider {
    @Inject(InventoryManager)
    private inventoryManager: InventoryManager;

    @Inject(LockBinService)
    private lockBinService: LockBinService;

    @Inject(ItemService)
    private itemService: ItemService;

    @Rpc(RpcServerEvent.BIN_IS_NOT_LOCKED)
    public isBinLock(source: number, id: string) {
        return !this.lockBinService.isLock(id);
    }

    @Rpc(RpcServerEvent.INVENTORY_SEARCH)
    public onSearch(source: number, storageId: string, itemId: string) {
        return this.inventoryManager.search(storageId, 'amount', itemId);
    }

    @OnEvent(ServerEvent.INVENTORY_ITEM_SHOW)
    public onShow(source: number, target: number, slotId: number) {
        const invItem = this.inventoryManager.getSlot(source, slotId);
        if (invItem) {
            this.itemService.executeShowCallback(source, target, invItem);
        }
    }
}
