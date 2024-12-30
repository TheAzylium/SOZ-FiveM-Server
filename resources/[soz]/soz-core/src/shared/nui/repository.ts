import { RepositoryType } from '../repository';

export interface NuiRepositoryMethodMap {
    Set: {
        type: RepositoryType;
        data: Record<any, any>;
    };
}
