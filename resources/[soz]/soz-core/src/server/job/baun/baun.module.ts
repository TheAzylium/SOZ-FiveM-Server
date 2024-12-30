import { Module } from '../../../core/decorators/module';
import { BaunCraftProvider } from './baun.craft.provider';
import { BaunHarvestProvider } from './baun.harvest.provider';
import { BaunResellProvider } from './baun.resell.provider';
import { BaunRestockProvider } from './baun.restock.provider';

@Module({
    providers: [BaunCraftProvider, BaunHarvestProvider, BaunResellProvider, BaunRestockProvider],
})
export class BaunModule {}
