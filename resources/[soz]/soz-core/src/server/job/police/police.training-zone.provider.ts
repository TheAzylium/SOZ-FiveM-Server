import { Once, OnceStep, OnEvent } from '@public/core/decorators/event';
import { Inject } from '@public/core/decorators/injectable';
import { Provider } from '@public/core/decorators/provider';
import { InventoryFactory } from '@public/server/inventory/inventory.factory';
import { ItemService } from '@public/server/item/item.service';
import { Notifier } from '@public/server/notifier';
import { PlayerService } from '@public/server/player/player.service';
import { ClientEvent, ServerEvent } from '@public/shared/event';
import { FDO_NO_FBI } from '@public/shared/job';
import {
    TRAINING_ZONE_FLAG_ATTACH_HEIGHT,
    TRAINING_ZONE_FLAG_MODEL,
    TRAINING_ZONE_FLAG_ROTATION,
    TRAINING_ZONE_MAX_RADIUS,
    TRAINING_ZONE_MIN_RADIUS,
    TRAINING_ZONE_POLE_MODEL,
    TrainingZone,
} from '@public/shared/police-training-zone';
import { Vector3 } from '@public/shared/polyzone/vector';

const poleProp = GetHashKey(TRAINING_ZONE_POLE_MODEL);
const flagProp = GetHashKey(TRAINING_ZONE_FLAG_MODEL);

@Provider()
export class PoliceTrainingZoneProvider {
    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(InventoryFactory)
    private inventoryFactory: InventoryFactory;

    @Inject(ItemService)
    private itemService: ItemService;

    @Inject(Notifier)
    private notifier: Notifier;

    private zones: { [id: string]: TrainingZone } = {};
    private attachedFlags: { [poleId: string]: number } = {};

    @Once(OnceStep.Start)
    public onStart() {
        this.itemService.setItemUseCallback('training_zone_flag', this.useTrainingZoneFlag.bind(this));
    }

    public async useTrainingZoneFlag(source: number): Promise<void> {
        const player = this.playerService.getPlayer(source);
        if (!player || !FDO_NO_FBI.includes(player.job.id)) {
            return;
        }

        TriggerClientEvent(ClientEvent.POLICE_TRAINING_ZONE_START_PLACEMENT, source);
    }

    @OnEvent(ServerEvent.POLICE_TRAINING_ZONE_PLACE)
    public async placeZone(source: number, position: Vector3, radius: number) {
        const player = this.playerService.getPlayer(source);
        if (!player || !FDO_NO_FBI.includes(player.job.id)) {
            return;
        }

        const clampedRadius = Math.min(TRAINING_ZONE_MAX_RADIUS, Math.max(TRAINING_ZONE_MIN_RADIUS, radius));

        const inventory = await this.inventoryFactory.getPlayerInventory(source);
        if (!inventory || !inventory.remove('training_zone_flag', 1, false)) {
            this.notifier.notify(source, "Vous n'avez plus le drapeau sur vous.", 'error');
            return;
        }

        const pole = CreateObjectNoOffset(poleProp, position[0], position[1], position[2], true, true, false);
        FreezeEntityPosition(pole, true);

        const flag = CreateObjectNoOffset(
            flagProp,
            position[0],
            position[1],
            position[2] + TRAINING_ZONE_FLAG_ATTACH_HEIGHT,
            true,
            true,
            false
        );
        SetEntityRotation(
            flag,
            TRAINING_ZONE_FLAG_ROTATION[0],
            TRAINING_ZONE_FLAG_ROTATION[1],
            TRAINING_ZONE_FLAG_ROTATION[2],
            2,
            true
        );
        FreezeEntityPosition(flag, true);

        const poleId = NetworkGetNetworkIdFromEntity(pole);
        this.zones[poleId] = { position, radius: clampedRadius };
        this.attachedFlags[poleId] = NetworkGetNetworkIdFromEntity(flag);
        TriggerClientEvent(ClientEvent.POLICE_TRAINING_ZONE_SYNC, -1, this.zones);
        this.notifier.notify(source, `Zone d'entraînement posée (rayon ${clampedRadius}m).`, 'success');
    }

    @OnEvent(ServerEvent.POLICE_TRAINING_ZONE_REMOVE)
    public async removeZone(source: number, id: number) {
        if (!this.zones[id]) {
            return;
        }

        const player = this.playerService.getPlayer(source);
        if (!player || !FDO_NO_FBI.includes(player.job.id)) {
            return;
        }

        DeleteEntity(NetworkGetEntityFromNetworkId(id));

        const flagId = this.attachedFlags[id];
        if (flagId) {
            DeleteEntity(NetworkGetEntityFromNetworkId(flagId));
            delete this.attachedFlags[id];
        }

        delete this.zones[id];
        TriggerClientEvent(ClientEvent.POLICE_TRAINING_ZONE_SYNC, -1, this.zones);
        this.notifier.notify(source, "Zone d'entraînement détruite.", 'success');
    }

    @OnEvent(ServerEvent.POLICE_TRAINING_ZONE_INIT)
    public async initZones(source: number) {
        TriggerClientEvent(ClientEvent.POLICE_TRAINING_ZONE_SYNC, source, this.zones);
    }
}
