import { OnEvent, OnNuiEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { ClientEvent, NuiEvent, ServerEvent } from '../../shared/event';
import { VehicleSeat } from '../../shared/vehicle/vehicle';
import { Radio, RadioChannel, RadioChannelType, RadioType } from '../../shared/voip';
import { NuiDispatch } from '../nui/nui.dispatch';
import { SoundService } from '../sound.service';
import { StateSelector, Store } from '../store/store';
import { VehicleStateService } from '../vehicle/vehicle.state.service';
import { VoipService } from './voip.service';

@Provider()
export class VoipRadioVehicleProvider {
    @Inject(SoundService)
    private readonly soundService: SoundService;

    @Inject(NuiDispatch)
    private readonly nuiDispatch: NuiDispatch;

    @Inject(VoipService)
    private voipService: VoipService;

    @Inject(VehicleStateService)
    private vehicleStateService: VehicleStateService;

    @Inject('Store')
    private store: Store;

    @StateSelector(state => state.radioLongRange.enabled)
    public toggleRadio(enabled: boolean) {
        const radioLongRange = this.store.getState().radioLongRange;

        if (!enabled) {
            this.voipService.disconnectRadio(radioLongRange.primary.frequency);
            this.voipService.disconnectRadio(radioLongRange.secondary.frequency);

            return;
        }

        if (radioLongRange.primary.frequency > 0) {
            this.voipService.connectRadio(radioLongRange.primary.frequency);
        }

        if (radioLongRange.secondary.frequency > 0) {
            this.voipService.connectRadio(radioLongRange.secondary.frequency);
        }
    }

    @StateSelector(state => state.radioLongRange.primary.frequency)
    public updatePrimaryFrequency(frequency: number, previousFrequency?: number) {
        const radioLongRange = this.store.getState().radioLongRange;

        if (!radioLongRange.enabled) {
            return;
        }

        if (previousFrequency > 0) {
            this.voipService.disconnectRadio(previousFrequency);
        }

        if (frequency >= 0) {
            this.voipService.connectRadio(frequency);
        }
    }

    @StateSelector(state => state.radioLongRange.secondary.frequency)
    public updateSecondaryFrequency(frequency: number, previousFrequency?: number) {
        const radioLongRange = this.store.getState().radioLongRange;

        if (!radioLongRange.enabled) {
            return;
        }

        if (previousFrequency > 0) {
            this.voipService.disconnectRadio(previousFrequency);
        }

        if (frequency >= 0) {
            this.voipService.connectRadio(frequency);
        }
    }

    @StateSelector(state => state.radioLongRange)
    public updateRadioShortRange(radioShortRange: Radio) {
        this.nuiDispatch.dispatch('radio_vehicle', 'Update', {
            ...radioShortRange,
            primaryClickVolume: this.voipService.getVoiceClickVolume(
                RadioType.RadioLongRange,
                RadioChannelType.Primary
            ),
            secondaryClickVolume: this.voipService.getVoiceClickVolume(
                RadioType.RadioLongRange,
                RadioChannelType.Secondary
            ),
        });
    }

    @OnEvent(ClientEvent.BASE_ENTERED_VEHICLE)
    public async onEnterVehicle() {
        const vehicle = GetVehiclePedIsIn(PlayerPedId(), false);

        if (!vehicle) {
            return;
        }

        if (
            GetPedInVehicleSeat(vehicle, VehicleSeat.Driver) !== PlayerPedId() &&
            GetPedInVehicleSeat(vehicle, VehicleSeat.Copilot) !== PlayerPedId()
        ) {
            return;
        }

        const vehicleState = await this.vehicleStateService.getVehicleState(vehicle);

        if (!vehicleState.hasRadio) {
            return;
        }

        this.store.dispatch.radioLongRange.enable(vehicleState.radioEnabled);
        this.store.dispatch.radioLongRange.updatePrimary(vehicleState.primaryRadio);
        this.store.dispatch.radioLongRange.updateSecondary(vehicleState.secondaryRadio);
    }

    @OnEvent(ClientEvent.BASE_LEFT_VEHICLE)
    public async onLeaveVehicle() {
        this.store.dispatch.radioLongRange.enable(false);
        this.nuiDispatch.dispatch('radio_vehicle', 'Close');
    }

    @OnNuiEvent(NuiEvent.VoipEnableRadioVehicle)
    public async onEnableRadio({ enable }: { enable: boolean }) {
        const vehicle = GetVehiclePedIsIn(PlayerPedId(), false);

        if (!vehicle) {
            return;
        }

        // is drive or copilot
        if (
            GetPedInVehicleSeat(vehicle, VehicleSeat.Driver) !== PlayerPedId() &&
            GetPedInVehicleSeat(vehicle, VehicleSeat.Copilot) !== PlayerPedId()
        ) {
            return;
        }

        const vehicleNetworkId = NetworkGetNetworkIdFromEntity(vehicle);

        TriggerServerEvent(ServerEvent.VOIP_RADIO_VEHICLE_ENABLE, vehicleNetworkId, enable);
    }

    @OnNuiEvent(NuiEvent.VoipUpdateRadioVehicleChannel)
    public async onUpdateRadioChannel({ channel, type }: { channel: Partial<RadioChannel>; type: RadioChannelType }) {
        const vehicle = GetVehiclePedIsIn(PlayerPedId(), false);

        if (!vehicle) {
            return;
        }

        // is drive or copilot
        if (
            GetPedInVehicleSeat(vehicle, VehicleSeat.Driver) !== PlayerPedId() &&
            GetPedInVehicleSeat(vehicle, VehicleSeat.Copilot) !== PlayerPedId()
        ) {
            return;
        }

        const vehicleNetworkId = NetworkGetNetworkIdFromEntity(vehicle);

        TriggerServerEvent(ServerEvent.VOIP_RADIO_VEHICLE_UPDATE, vehicleNetworkId, type, channel);
    }

    @OnNuiEvent(NuiEvent.VoipUpdateRadioVehicleVolumeClick)
    public async onUpdateRadioVolumeClick({ volume, type }: { volume: number; type: RadioChannelType }) {
        this.voipService.setVoiceClickVolume(RadioType.RadioLongRange, type, volume);
        this.soundService.play(RadioType.RadioLongRange + '/mic_click_on', volume / 100);

        this.nuiDispatch.dispatch('radio_vehicle', 'Update', {
            ...this.store.getState().radioLongRange,
            primaryClickVolume: this.voipService.getVoiceClickVolume(
                RadioType.RadioLongRange,
                RadioChannelType.Primary
            ),
            secondaryClickVolume: this.voipService.getVoiceClickVolume(
                RadioType.RadioLongRange,
                RadioChannelType.Secondary
            ),
        });
    }

    @OnEvent(ClientEvent.VOIP_RADIO_VEHICLE_ENABLE)
    public onEnableRadioVehicle(vehicleNetworkId: number, enable: boolean) {
        if (!NetworkDoesNetworkIdExist(vehicleNetworkId)) {
            return;
        }

        const vehicle = NetworkGetEntityFromNetworkId(vehicleNetworkId);

        if (!vehicle) {
            return;
        }

        if (vehicle !== GetVehiclePedIsIn(PlayerPedId(), false)) {
            return;
        }

        if (
            GetPedInVehicleSeat(vehicle, VehicleSeat.Driver) !== PlayerPedId() &&
            GetPedInVehicleSeat(vehicle, VehicleSeat.Copilot) !== PlayerPedId()
        ) {
            return;
        }

        this.store.dispatch.radioLongRange.enable(enable);
    }

    @OnEvent(ClientEvent.VOIP_RADIO_VEHICLE_UPDATE)
    public onUpdateRadioVehicle(vehicleNetworkId: number, type: RadioChannelType, channel: Partial<RadioChannel>) {
        if (!NetworkDoesNetworkIdExist(vehicleNetworkId)) {
            return;
        }

        const vehicle = NetworkGetEntityFromNetworkId(vehicleNetworkId);

        if (!vehicle) {
            return;
        }

        if (vehicle !== GetVehiclePedIsIn(PlayerPedId(), false)) {
            return;
        }

        if (
            GetPedInVehicleSeat(vehicle, VehicleSeat.Driver) !== PlayerPedId() &&
            GetPedInVehicleSeat(vehicle, VehicleSeat.Copilot) !== PlayerPedId()
        ) {
            return;
        }

        if (type === RadioChannelType.Primary) {
            this.store.dispatch.radioLongRange.updatePrimary(channel);
        } else {
            this.store.dispatch.radioLongRange.updateSecondary(channel);
        }
    }

    public openRadioInterface() {
        this.nuiDispatch.dispatch('radio_vehicle', 'Open', {
            ...this.store.getState().radioLongRange,
            primaryClickVolume: this.voipService.getVoiceClickVolume(
                RadioType.RadioLongRange,
                RadioChannelType.Primary
            ),
            secondaryClickVolume: this.voipService.getVoiceClickVolume(
                RadioType.RadioLongRange,
                RadioChannelType.Secondary
            ),
        });
    }
}
