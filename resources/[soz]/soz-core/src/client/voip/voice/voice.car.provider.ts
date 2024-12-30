import { Provider } from '@public/core/decorators/provider';

import { Inject } from '../../../core/decorators/injectable';
import { Tick } from '../../../core/decorators/tick';
import { VoiceListeningService } from './voice.listening.service';
import { VoiceTargetService } from './voice.target.service';

@Provider()
export class VoiceCarProvider {
    @Inject(VoiceTargetService)
    private voiceTargetService: VoiceTargetService;

    @Inject(VoiceListeningService)
    private voiceListeningService: VoiceListeningService;

    private currentCarPlayers = new Set<number>();

    @Tick()
    public checkCarPlayers() {
        const vehicle = GetVehiclePedIsIn(PlayerPedId(), false);

        if (!vehicle) {
            if (this.currentCarPlayers.size > 0) {
                for (const player of this.currentCarPlayers) {
                    this.voiceListeningService.removePlayerAudioContext(player, 'car');
                    this.voiceTargetService.removePlayer(player, 'car');
                }

                this.currentCarPlayers.clear();
            }

            return;
        }

        const seatCount = GetVehicleNumberOfPassengers(vehicle);
        const selfPlayerId = GetPlayerServerId(PlayerId());
        const playerVehicles = new Set<number>();

        for (let seat = -1; seat < seatCount; seat++) {
            if (IsVehicleSeatFree(vehicle, seat)) {
                continue;
            }

            const player = GetPlayerServerId(NetworkGetPlayerIndexFromPed(GetPedInVehicleSeat(vehicle, seat)));

            if (!player) {
                continue;
            }

            if (player === selfPlayerId) {
                continue;
            }

            playerVehicles.add(player);
        }

        // get diff
        const leftPlayers = new Set([...this.currentCarPlayers].filter(x => !playerVehicles.has(x)));
        const newPlayers = new Set([...playerVehicles].filter(x => !this.currentCarPlayers.has(x)));

        // remove players from audio context
        for (const player of leftPlayers) {
            this.voiceTargetService.removePlayer(player, 'car');
            this.voiceListeningService.removePlayerAudioContext(player, 'car');
        }

        // add players to audio context
        for (const player of newPlayers) {
            this.voiceTargetService.addPlayer(player, 'car');
            this.voiceListeningService.addPlayerAudioContext(player, 'car', {
                type: 'car',
                priority: 3,
            });
        }

        this.currentCarPlayers = playerVehicles;
    }
}
