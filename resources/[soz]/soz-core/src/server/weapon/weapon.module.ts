import { Module } from '../../core/decorators/module';
import { TrainingSessionService } from './training.session.service';
import { TrainingWatchProvider } from './training.watch.provider';
import { TrainingWeaponProvider } from './training.weapon.provider';
import { WeaponGunsmithProvider } from './weapon.gunsmith.provider';
import { WeaponProvider } from './weapon.provider';

@Module({
    providers: [
        WeaponProvider,
        WeaponGunsmithProvider,
        TrainingSessionService,
        TrainingWeaponProvider,
        TrainingWatchProvider,
    ],
})
export class WeaponModule {}
