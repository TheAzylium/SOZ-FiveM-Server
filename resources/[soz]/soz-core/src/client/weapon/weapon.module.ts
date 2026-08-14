import { Module } from '../../core/decorators/module';
import { TrainingWatchProvider } from './training.watch.provider';
import { TrainingWeaponProvider } from './training.weapon.provider';
import { WeaponDrawingProvider } from './weapon.drawing.provider';
import { WeaponGunsmithProvider } from './weapon.gunsmith.provider';
import { WeaponProvider } from './weapon.provider';

@Module({
    providers: [
        WeaponProvider,
        WeaponDrawingProvider,
        WeaponGunsmithProvider,
        TrainingWeaponProvider,
        TrainingWatchProvider,
    ],
})
export class WeaponModule {}
