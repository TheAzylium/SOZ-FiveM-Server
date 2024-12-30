import { Module } from '../../core/decorators/module';
import { BossShopProvider } from './boss.shop.provider';
import { ClothingProvider } from './clothing.provider';
import { EasterShopProvider } from './easter.shop.provider';
import { MigrationProvider } from './migration.provider';
import { ShopProvider } from './shop.provider';

@Module({
    providers: [MigrationProvider, ShopProvider, EasterShopProvider, ClothingProvider, BossShopProvider],
})
export class ShopModule {}
