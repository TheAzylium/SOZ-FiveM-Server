import { Module } from '@core/decorators/module';

import { GouvFineProvider } from './gouv.fine.provider';
import { GouvProvider } from './gouv.provider';
import { GouvRadarProvider } from './gouv.radar.provider';

@Module({
    providers: [GouvFineProvider, GouvProvider, GouvRadarProvider],
})
export class GouvModule {}
