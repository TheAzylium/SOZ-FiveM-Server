import { Command } from '../../core/decorators/command';
import { Once, OnceStep } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Tick } from '../../core/decorators/tick';
import { VoiceMode } from '../../shared/hud';
import { PlayerService } from '../player/player.service';
import { VoipService } from './voip.service';

@Provider()
export class VoipProvider {
    @Inject(PlayerService)
    private readonly playerService: PlayerService;

    @Inject(VoipService)
    private readonly voipService: VoipService;

    private talkingPlayers = new Set<number>();

    @Once(OnceStep.PlayerLoaded)
    public loadFacialAnim() {
        RequestAnimDict('facials@gen_female@base');
        RequestAnimDict('mp_facial');

        this.voipService.updateRange();
    }

    @Tick(300)
    public checkNetworkPlayerTalking() {
        const selfPlayer = PlayerId();

        for (const player of GetActivePlayers()) {
            const isTalking =
                NetworkIsPlayerTalking(player) && (player !== selfPlayer || !this.voipService.isPlayerMuted());

            if (isTalking) {
                PlayFacialAnim(GetPlayerPed(player), 'mic_chatter', 'mp_facial');
                this.talkingPlayers.add(player);
            } else if (!isTalking && this.talkingPlayers.has(player)) {
                PlayFacialAnim(GetPlayerPed(player), 'dead_1', 'facials@gen_female@base');
                this.talkingPlayers.delete(player);
            }
        }
    }

    @Command('voip-voice_up', {
        description: 'Parler plus fort',
        passthroughNuiFocus: true,
        keys: [
            {
                mapper: 'keyboard',
                key: 'F6',
            },
        ],
    })
    public voiceUp() {
        const currentMode = this.voipService.getVoiceMode();

        if (
            currentMode === VoiceMode.Mute ||
            currentMode === VoiceMode.Shouting ||
            currentMode === VoiceMode.Microphone ||
            currentMode === VoiceMode.Megaphone
        ) {
            return;
        }

        if (currentMode === VoiceMode.Normal) {
            this.voipService.setVoiceModeRange(VoiceMode.Shouting);
            return;
        }

        if (currentMode === VoiceMode.Whisper) {
            this.voipService.setVoiceModeRange(VoiceMode.Normal);
            return;
        }
    }

    @Command('voip-voice_down', {
        description: 'Parler moins fort',
        passthroughNuiFocus: true,
        keys: [
            {
                mapper: 'keyboard',
                key: 'F5',
            },
        ],
    })
    public voiceDown() {
        const currentMode = this.voipService.getVoiceMode();

        if (
            currentMode === VoiceMode.Mute ||
            currentMode === VoiceMode.Whisper ||
            currentMode === VoiceMode.Microphone ||
            currentMode === VoiceMode.Megaphone
        ) {
            return;
        }

        if (currentMode === VoiceMode.Normal) {
            this.voipService.setVoiceModeRange(VoiceMode.Whisper);
            return;
        }

        if (currentMode === VoiceMode.Shouting) {
            this.voipService.setVoiceModeRange(VoiceMode.Normal);
            return;
        }
    }

    @Command('voip-voice_mute', {
        description: 'Ne plus parler',
        passthroughNuiFocus: true,
        keys: [
            {
                mapper: 'keyboard',
                key: 'F7',
            },
        ],
    })
    public async mute() {
        const state = this.playerService.getState();

        if (state.isInHub) {
            return;
        }

        await this.voipService.mutePlayer(!this.voipService.isPlayerMuted());
    }
}
