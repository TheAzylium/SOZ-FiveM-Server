import { Module } from '../../core/decorators/module';
import { TrainingWeaponProvider } from './training.weapon.provider';
import { WeaponGunsmithProvider } from './weapon.gunsmith.provider';
import { WeaponProvider } from './weapon.provider';

@Module({
    providers: [WeaponProvider, WeaponGunsmithProvider, TrainingWeaponProvider],
})
export class WeaponModule {}
