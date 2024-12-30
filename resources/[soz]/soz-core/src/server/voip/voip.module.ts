import { Module } from '../../core/decorators/module';
import { VoipProvider } from './voip.provider';
import { VoipRadioProvider } from './voip.radio.provider';
import { VoipVoicePhoneProvider } from './voip.voice.phone.provider';
import { VoipVoiceRadioProvider } from './voip.voice.radio.provider';

@Module({
    providers: [VoipProvider, VoipRadioProvider, VoipVoicePhoneProvider, VoipVoiceRadioProvider],
})
export class VoipModule {}
