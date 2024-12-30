import { GarageList } from '@public/config/garage';
import { VehicleClass } from '@public/shared/vehicle/vehicle';

import { OnEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { ServerEvent } from '../../shared/event';
import { PrismaService } from '../database/prisma.service';
import { InventoryManager } from '../inventory/inventory.manager';
import { Notifier } from '../notifier';
import { PlayerService } from '../player/player.service';
import { VehicleService } from './vehicle.service';
import { VehicleStateService } from './vehicle.state.service';

@Provider()
export class VehicleProvider {
    @Inject(PrismaService)
    private prismaService: PrismaService;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(VehicleService)
    private vehicleService: VehicleService;

    @Inject(VehicleStateService)
    private vehicleStateService: VehicleStateService;

    @Inject(InventoryManager)
    private inventoryManager: InventoryManager;

    @OnEvent(ServerEvent.ADMIN_ADD_VEHICLE)
    public async addVehicle(source: number, model: string, name: string, vehClass: VehicleClass, mods: any[]) {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return;
        }

        const garage = vehClass == VehicleClass.Boats ? 'docks_boat' : 'airport_public';

        await this.prismaService.playerVehicle.create({
            data: {
                license: player.license,
                citizenid: player.citizenid,
                vehicle: name,
                hash: model.toString(),
                mods: JSON.stringify(mods),
                plate: await this.vehicleService.generatePlate(),
                garage: garage,
                state: 1,
                boughttime: Math.floor(new Date().getTime() / 1000),
                parkingtime: Math.floor(new Date().getTime() / 1000),
            },
        });

        const garageConfig = GarageList[garage];

        this.notifier.notify(source, 'Une version de ce véhicule ~g~a été ajouté~s~ au ' + garageConfig.name);
    }

    @OnEvent(ServerEvent.VEHICLE_COLLECT_FINGERPRINT)
    public async collectFingerprint(source: number, vehicleNetworkId: number, zone: string, model: string) {
        const fingerprint = this.vehicleStateService.getVehicleState(vehicleNetworkId).volatile.fingerprint;
        if (!fingerprint) {
            this.notifier.error(source, "Aucune empreinte n'a été trouvée sur ce véhicule.");
            return;
        }
        const { success, reason } = this.inventoryManager.addItemToInventory(source, 'evidence_fingerprint', 1, {
            evidenceInfos: {
                generalInfo: `Empreinte de ${fingerprint}`,
                type: 'evidence_fingerprint',
                zone,
                support: model,
                quantity: 1,
            },
        });
        if (!success) {
            this.notifier.error(source, reason);
            return;
        }
        this.notifier.notify(source, 'Empreinte récupérée.');
        this.vehicleStateService.updateVehicleVolatileState(vehicleNetworkId, {
            fingerprint: null,
        });
    }

    @OnEvent(ServerEvent.VEHICLE_COLLECT_DRUG)
    public async collectDrug(source: number, vehicleNetworkId: number, zone: string, model: string) {
        const drugTypes = this.vehicleStateService.getVehicleState(vehicleNetworkId).volatile.lastDrugTrace;
        if (!drugTypes || drugTypes.length == 0) {
            this.notifier.error(source, "Aucune trace de drogue n'a été trouvée sur ce véhicule.");
            return;
        }
        const { success, reason } = this.inventoryManager.addItemToInventory(source, 'evidence_drug', 1, {
            evidenceInfos: {
                generalInfo: `Trace de ${drugTypes.join(', ')}`,
                type: 'evidence_drug',
                zone,
                support: model,
                quantity: 1,
            },
        });
        if (!success) {
            this.notifier.error(source, reason);
            return;
        }
        this.notifier.notify(source, 'Échantillon de drogue récupéré.');
        this.vehicleStateService.updateVehicleVolatileState(vehicleNetworkId, {
            lastDrugTrace: null,
        });
    }
}
