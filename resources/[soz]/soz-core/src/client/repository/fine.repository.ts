import { Injectable } from '../../core/decorators/injectable';
import { RepositoryType } from '../../shared/repository';
import { Repository } from './repository';

@Injectable(FineRepository, Repository)
export class FineRepository extends Repository<RepositoryType.Fine> {
    public type = RepositoryType.Fine;
}
