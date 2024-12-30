import { ClientEvent } from '@public/shared/event/client';

import { GarageList } from '../../config/garage';
import { Inject, Injectable } from '../../core/decorators/injectable';
import { BoxZone } from '../../shared/polyzone/box.zone';
import { Garage, GarageCategory, GarageType, PlaceCapacity } from '../../shared/vehicle/garage';
import { PrismaService } from '../database/prisma.service';
import { RepositoryLegacy } from './repository';

type DatabaseZone = {
    x: number;
    y: number;
    z: number;
    heading: number;
    minZ: number;
    maxZ: number;
};

@Injectable()
export class GarageRepository extends RepositoryLegacy<Record<string, Garage>> {
    @Inject(PrismaService)
    private prismaService: PrismaService;

    protected async load(): Promise<Record<string, Garage>> {
        const garageList: Record<string, Garage> = {};

        for (const id of Object.keys(GarageList)) {
            garageList[id] = {
                id,
                ...GarageList[id],
            };
        }

        const houseProperties = await this.prismaService.housing_property.findMany({
            where: {
                NOT: { garage_zone: null },
            },
        });

        for (const houseProperty of houseProperties) {
            garageList[houseProperty.identifier] = this.garageFromDB(
                houseProperty.identifier,
                houseProperty.garage_zone,
                houseProperty.entry_zone
            );
        }

        return garageList;
    }

    private garageFromDB(identifier: string, garage_zone: string, entry_zone: string): Garage {
        const entryZone = JSON.parse(entry_zone) as DatabaseZone;
        const garageZone = JSON.parse(garage_zone) as DatabaseZone;

        return {
            id: `property_${identifier}`,
            name: 'Garage personnel',
            type: GarageType.House,
            category: GarageCategory.All,
            zone: new BoxZone([entryZone.x, entryZone.y, entryZone.z], 8.0, 6.0, {
                heading: entryZone.heading,
                minZ: entryZone.minZ,
                maxZ: entryZone.maxZ,
            }),
            parkingPlaces: [
                new BoxZone([garageZone.x, garageZone.y, garageZone.z], 8.0, 6.0, {
                    heading: garageZone.heading,
                    minZ: garageZone.minZ,
                    maxZ: garageZone.maxZ,
                    data: {
                        capacity: [PlaceCapacity.Large, PlaceCapacity.Medium, PlaceCapacity.Small],
                    },
                }),
            ],
            isTrailerGarage: identifier.includes('trailer'),
        };
    }

    public async updateAddGarage(identifier: string, garage_zone: string, entry_zone: string) {
        const garageList = await this.get();

        garageList[identifier] = this.garageFromDB(identifier, garage_zone, entry_zone);

        TriggerLatentClientEvent(ClientEvent.VEHICLE_GARAGE_UPDATE, -1, 16 * 1024, identifier, garageList[identifier]);
    }
}
