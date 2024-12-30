import { Inject, Injectable } from '../../core/decorators/injectable';
import { Fine } from '../../shared/job/police';
import { RepositoryType } from '../../shared/repository';
import { PrismaService } from '../database/prisma.service';
import { Repository } from './repository';

@Injectable(FineRepository, Repository)
export class FineRepository extends Repository<RepositoryType.Fine> {
    @Inject(PrismaService)
    private prismaService: PrismaService;

    public type = RepositoryType.Fine;

    protected async load(): Promise<Record<number, Fine>> {
        const fines = await this.prismaService.police_fines.findMany();
        const list: Record<number, Fine> = {};

        for (const fine of fines) {
            list[fine.id] = {
                category: fine.category,
                id: fine.id,
                label: fine.label,
                price: { min: fine.price_min, max: fine.price_max },
            };
        }

        return list;
    }

    public async add(label: string, category: number, min: number, max: number): Promise<void> {
        const fine = await this.prismaService.police_fines.create({
            data: {
                category,
                label,
                price_min: min,
                price_max: max,
                created_at: new Date(),
                updated_at: new Date(),
                description: '',
            },
        });

        this.data[fine.id] = {
            category: fine.category,
            id: fine.id,
            label: fine.label,
            price: { min: fine.price_min, max: fine.price_max },
        };
    }

    public async remove(id: number): Promise<void> {
        await this.prismaService.police_fines.delete({ where: { id } });

        delete this.data[id];
    }

    public async setLabel(id: number, label: string): Promise<void> {
        await this.prismaService.police_fines.update({ where: { id }, data: { label } });

        this.data[id].label = label;
    }

    public async setMinPrice(id: number, price: number): Promise<void> {
        await this.prismaService.police_fines.update({ where: { id }, data: { price_min: price } });

        this.data[id].price.min = price;
    }

    public async setMaxPrice(id: number, price: number): Promise<void> {
        await this.prismaService.police_fines.update({ where: { id }, data: { price_max: price } });

        this.data[id].price.max = price;
    }
}
