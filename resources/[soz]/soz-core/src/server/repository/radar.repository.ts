import { Inject, Injectable } from '@core/decorators/injectable';
import { RepositoryType } from '@public/shared/repository';

import { Vector4 } from '../../shared/polyzone/vector';
import { Radar } from '../../shared/vehicle/radar';
import { PrismaService } from '../database/prisma.service';
import { Repository } from './repository';

@Injectable(RadarRepository, Repository)
export class RadarRepository extends Repository<RepositoryType.Radar> {
    @Inject(PrismaService)
    private prismaService: PrismaService;

    public type = RepositoryType.Radar;

    protected async load(): Promise<Record<number, Radar>> {
        const radars = await this.prismaService.radar.findMany();
        const list: Record<number, Radar> = {};

        for (const radar of radars) {
            list[radar.id] = {
                id: radar.id,
                position: radar.position as Vector4,
                speed: radar.speed,
                enabled: radar.enabled,
                destroyed: radar.destroyed,
            };
        }

        return list;
    }

    public async add(position: Vector4) {
        const data = await this.prismaService.radar.create({
            data: {
                position,
                speed: 0,
                enabled: true,
                destroyed: false,
                speed_record: 0,
            },
        });

        this.data[data.id] = {
            id: data.id,
            position: data.position as Vector4,
            speed: data.speed,
            enabled: data.enabled,
            destroyed: data.destroyed,
        };
    }

    public async setSpeed(id: number, speed: number) {
        await this.prismaService.radar.update({
            where: { id },
            data: { speed },
        });

        this.data[id].speed = speed;
    }

    public async setEnabled(id: number, enabled: boolean) {
        await this.prismaService.radar.update({
            where: { id },
            data: { enabled },
        });

        this.data[id].enabled = enabled;
    }

    public async setDestroyed(id: number, destroyed: boolean) {
        await this.prismaService.radar.update({
            where: { id },
            data: { destroyed },
        });

        this.data[id].destroyed = destroyed;
    }

    public async remove(id: number) {
        await this.prismaService.radar.delete({ where: { id } });

        delete this.data[id];
    }
}
