import { Module } from '../../core/decorators/module';
import { VoiceCarProvider } from './voice/voice.car.provider';
import { VoiceDebugProvider } from './voice/voice.debug.provider';
import { VoicePhoneProvider } from './voice/voice.phone.provider';
import { VoiceProvider } from './voice/voice.provider';
import { VoiceProximityProvider } from './voice/voice.proximity.provider';
import { VoiceRadioProvider } from './voice/voice.radio.provider';
import { VoipMegaphoneProvider } from './voip.megaphone.provider';
import { VoipMicrophoneProvider } from './voip.microphone.provider';
import { VoipProvider } from './voip.provider';
import { VoipRadioProvider } from './voip.radio.provider';
import { VoipRadioVehicleProvider } from './voip.radio.vehicle.provider';

@Module({
    providers: [
        VoiceCarProvider,
        VoiceDebugProvider,
        VoicePhoneProvider,
        VoiceProvider,
        VoiceProximityProvider,
        VoiceRadioProvider,
        VoipMegaphoneProvider,
        VoipMicrophoneProvider,
        VoipProvider,
        VoipRadioProvider,
        VoipRadioVehicleProvider,
    ],
})
export class VoipModule {}
