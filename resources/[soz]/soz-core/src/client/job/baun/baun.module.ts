import { Module } from '../../../core/decorators/module';
import { BaunCraftProvider } from './baun.craft.provider';
import { BaunHarvestProvider } from './baun.harvest.provider';
import { BaunProvider } from './baun.provider';
import { BaunResellProvider } from './baun.resell.provider';

@Module({
    providers: [BaunProvider, BaunHarvestProvider, BaunCraftProvider, BaunResellProvider],
})
export class BaunModule {}
