import { Module } from '../../../core/decorators/module';
import { OilCraftProvider } from './oil.craft.provider';
import { OilMenuProvider } from './oil.menu.provider';
import { OilProvider } from './oil.provider';
import { OilStationProvider } from './oil.station.provider';
import { OilTankerProvider } from './oil.tanker.provider';

@Module({
    providers: [OilCraftProvider, OilMenuProvider, OilProvider, OilStationProvider, OilTankerProvider],
})
export class OilModule {}
