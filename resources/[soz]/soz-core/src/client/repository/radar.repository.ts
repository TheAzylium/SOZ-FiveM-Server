import { Injectable } from '@core/decorators/injectable';
import { Repository } from '@public/client/repository/repository';
import { RepositoryType } from '@public/shared/repository';

@Injectable(RadarRepository, Repository)
export class RadarRepository extends Repository<RepositoryType.Radar> {
    public type = RepositoryType.Radar;

    // public disable(id: string, duration: number) {
    //     if (id.startsWith(RADAR_ID_PREFIX)) {
    //         id = id.replace(RADAR_ID_PREFIX, '');
    //     }
    //     const disableEndTime = Math.round(Date.now() / 1000 + duration);
    //     RadarList[id].disableTime = disableEndTime;
    //     SetResourceKvpInt('radar/disableEndTime/' + id, disableEndTime);
    // }
}
