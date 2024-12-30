import { Inject, Injectable } from '../../core/decorators/injectable';
import { Configuration, DEFAULT_CONFIGURATION } from '../../shared/configuration';
import { RepositoryType } from '../../shared/repository';
import { PrismaService } from '../database/prisma.service';
import { Repository } from './repository';

@Injectable(ConfigurationRepository, Repository)
export class ConfigurationRepository extends Repository<
    RepositoryType.Configuration,
    keyof Configuration,
    Configuration[keyof Configuration]
> {
    @Inject(PrismaService)
    private prismaService: PrismaService;

    protected data: Configuration;

    public type = RepositoryType.Configuration;

    protected async load(): Promise<Configuration> {
        const data = await this.prismaService.configuration.findMany();
        const configuration = {};

        for (const config of data) {
            configuration[config.name] = config.value;
        }

        return configuration as Configuration;
    }

    public async update<T extends keyof Configuration>(name: T, value: Configuration[T]): Promise<void> {
        await this.prismaService.configuration.upsert({
            where: { name },
            update: { value },
            create: { name, value },
        });

        this.data[name] = value;
    }

    public async getValue<T extends keyof Configuration>(name: T): Promise<Configuration[T]> {
        const value = await this.find(name);

        if (!value) {
            return DEFAULT_CONFIGURATION[name];
        }

        return {
            ...DEFAULT_CONFIGURATION[name],
            ...value,
        };
    }
}
