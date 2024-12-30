import { Injectable } from '../../core/decorators/injectable';
import { Configuration, DEFAULT_CONFIGURATION } from '../../shared/configuration';
import { RepositoryType } from '../../shared/repository';
import { Repository } from './repository';

@Injectable(ConfigurationRepository, Repository)
export class ConfigurationRepository extends Repository<RepositoryType.Configuration> {
    public type = RepositoryType.Configuration;

    public getValue<T extends keyof Configuration>(name: T): Configuration[T] {
        const value = this.find(name);

        if (!value) {
            return DEFAULT_CONFIGURATION[name];
        }

        return {
            ...DEFAULT_CONFIGURATION[name],
            ...value,
        };
    }
}
