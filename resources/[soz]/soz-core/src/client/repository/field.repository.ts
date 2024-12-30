import { Injectable } from '../../core/decorators/injectable';
import { RepositoryType } from '../../shared/repository';
import { Repository } from './repository';

@Injectable(FieldRepository, Repository)
export class FieldRepository extends Repository<RepositoryType.Field> {
    public type = RepositoryType.Field;
}
