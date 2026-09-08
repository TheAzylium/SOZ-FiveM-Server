import { Module } from '../../core/decorators/module';
import { WeaponDrawingProvider } from './weapon.drawing.provider';
import { WeaponGunsmithProvider } from './weapon.gunsmith.provider';
import { WeaponProvider } from './weapon.provider';

@Module({
    providers: [WeaponProvider, WeaponGunsmithProvider, WeaponDrawingProvider],
})
export class WeaponModule {}
