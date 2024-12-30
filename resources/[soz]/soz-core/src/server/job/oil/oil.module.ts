import { Module } from '../../../core/decorators/module';
import { OilCraftProvider } from './oil.craft.provider';
import { OilStationProvider } from './oil.station.provider';
import { OilTankerProvider } from './oil.tanker.provider';

@Module({
    providers: [OilCraftProvider, OilStationProvider, OilTankerProvider],
})
export class OilModule {}
