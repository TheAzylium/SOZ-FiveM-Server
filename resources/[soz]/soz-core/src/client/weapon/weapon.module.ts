import { Module } from '../../core/decorators/module';
import { WeaponDrawingProvider } from './weapon.drawing.provider';
import { WeaponDrawingRemoteProvider } from './weapon.drawing.remote.provider';
import { WeaponGunsmithProvider } from './weapon.gunsmith.provider';
import { WeaponProvider } from './weapon.provider';

@Module({
    providers: [WeaponProvider, WeaponDrawingProvider, WeaponDrawingRemoteProvider, WeaponGunsmithProvider],
})
export class WeaponModule {}
