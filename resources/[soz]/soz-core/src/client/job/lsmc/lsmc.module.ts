import { Module } from '../../../core/decorators/module';
import { LSMCCheckHealthProvider } from './lsmc.check.health.provider';
import { LSMCCloakroomProvider } from './lsmc.cloakroom.provider';
import { LSMCDamageProvider } from './lsmc.damage.provider';
import { LSMCDeathProvider } from './lsmc.death.provider';
import { LSMCHalloweenProvider } from './lsmc.halloween.provider';
import { LSMCInteractionProvider } from './lsmc.interaction.provider';
import { LSMCMedicalDiagProvider } from './lsmc.medical.diag.provider';
import { LSMCPharmacyProvider } from './lsmc.pharmacy.provider';
import { LSMCPlasterProvider } from './lsmc.plaster.provider';
import { LSMCProvider } from './lsmc.provider';
import { LSMCStretcherProvider } from './lsmc.stretcher.provider';
import { LSMCSurgeryProvider } from './lsmc.surgery.provider';
import { LSMCWheelChairProvider } from './lsmc.wheelchair.provider';

@Module({
    providers: [
        LSMCCheckHealthProvider,
        LSMCPharmacyProvider,
        LSMCHalloweenProvider,
        LSMCDeathProvider,
        LSMCCloakroomProvider,
        LSMCInteractionProvider,
        LSMCSurgeryProvider,
        LSMCProvider,
        LSMCDamageProvider,
        LSMCMedicalDiagProvider,
        LSMCStretcherProvider,
        LSMCWheelChairProvider,
        LSMCPlasterProvider,
    ],
})
export class LSMCModule {}
