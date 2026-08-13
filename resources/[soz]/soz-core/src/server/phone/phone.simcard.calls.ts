import { Provider } from '@public/core/decorators/provider';
import { RpcServerEvent } from '@public/shared/rpc';

import { Inject } from '../../core/decorators/injectable';
import { Rpc } from '../../core/decorators/rpc';
import { uuidv4 } from '../../core/utils';
import { ClientEvent } from '../../shared/event/client';
import { ServerEvent } from '../../shared/event/server';
import { ActiveCall } from '../../shared/phone/simcard';
import { PlayerData } from '../../shared/player';
import { Err, Ok, Result } from '../../shared/result';
import { PrismaService } from '../database/prisma.service';
import { PlayerService } from '../player/player.service';
import { Store } from '../store/store';
import { PhoneBoothState } from './phone.booth.state';

@Provider()
export class PhoneSimCardCalls {
    @Inject('Store')
    private store: Store;

    @Inject(PrismaService)
    private readonly prismaService: PrismaService;

    @Inject(PlayerService)
    private readonly playerService: PlayerService;

    @Inject(PhoneBoothState)
    private readonly phoneBoothState: PhoneBoothState;

    private calls = new Map<string, ActiveCall>();

    @Rpc(RpcServerEvent.PHONE_SIMCARD_CALLS_INIT)
    async initCalls(source: number, phoneNumber: string) {
        const player = this.playerService.getPlayer(source);
        if (!player) {
            console.error('Player not found for', source);
            return Err('unavailable');
        }

        if (!this.playerService.getPlayerByPhone(phoneNumber) && this.phoneBoothState.isBoothNumber(phoneNumber)) {
            return this.ringBooth(player, phoneNumber);
        }

        const targetPlayer = this.playerService.getPlayerByPhone(phoneNumber);
        if (!targetPlayer || this.playerAlreadyInCall(targetPlayer.source)) {
            const identifier = uuidv4();

            await this.prismaService.phone_calls.create({
                data: {
                    identifier: identifier,
                    transmitter: player.charinfo.phone,
                    receiver: phoneNumber,
                    start: new Date(),
                    end: new Date(),
                    is_accepted: 0,
                },
            });

            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, player.source, {
                identifier: identifier,
                transmitter: player.charinfo.phone,
                transmitterSource: player.source,
                receiver: phoneNumber,
                receiverSource: -1,
                start: Date.now(),
                end: Date.now(),
                is_accepted: false,
                isTransmitter: true,
            });
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_INIT, player.source);
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, player.source);

            return Ok('unavailable');
        }

        this.calls.set(player.charinfo.phone, {
            identifier: uuidv4(),
            transmitter: player.charinfo.phone,
            transmitterSource: player.source,
            receiver: targetPlayer.charinfo.phone,
            receiverSource: targetPlayer.source,
            start: Date.now(),
            end: Date.now(),
            is_accepted: false,
        });

        const currentCall = this.calls.get(player.charinfo.phone);

        await this.prismaService.phone_calls.create({
            data: {
                identifier: currentCall.identifier,
                transmitter: player.charinfo.phone,
                receiver: targetPlayer.charinfo.phone,
                start: new Date(currentCall.start),
                end: new Date(currentCall.end),
                is_accepted: currentCall.is_accepted ? 1 : 0,
            },
        });

        this.sendCallDataToClients(currentCall);

        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_INIT, currentCall.transmitterSource);
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_RECEIVE, currentCall.receiverSource);

        return Ok('success');
    }

    @Rpc(RpcServerEvent.PHONE_SIMCARD_CALLS_ACCEPT)
    async acceptCall(source: number, phoneNumber: string) {
        const currentCall = this.calls.get(phoneNumber);
        if (!currentCall) {
            console.error('Call not found in active calls map for', phoneNumber);
            return Err('Call not found');
        }

        const blackout = this.store.getState().global.blackout;
        const blackoutLevel = this.store.getState().global.blackoutLevel;

        if (blackout || blackoutLevel > 2) {
            return;
        }

        currentCall.is_accepted = true;

        await this.prismaService.phone_calls.updateMany({
            where: { identifier: currentCall.identifier },
            data: { is_accepted: 1 },
        });

        TriggerEvent(
            ServerEvent.VOIP_PHONE_CALL_START,
            currentCall.transmitter,
            currentCall.receiver,
            currentCall.transmitterSource,
            currentCall.receiverSource
        );

        this.sendCallDataToClients(currentCall);
    }

    @Rpc(RpcServerEvent.PHONE_SIMCARD_CALLS_DECLINE)
    async declineCall(source: number, phoneNumber: string) {
        const currentCall = this.calls.get(phoneNumber);
        if (!currentCall) {
            console.error('Call not found in active calls map for', phoneNumber);
            return Err('Call not found');
        }

        await this.prismaService.phone_calls.updateMany({
            where: { identifier: currentCall.identifier },
            data: { is_accepted: 0, end: new Date() },
        });

        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, currentCall.transmitterSource, null);
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, currentCall.receiverSource, null);

        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, currentCall.transmitterSource);
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, currentCall.receiverSource);

        if (!currentCall.is_accepted) {
            this.notifyBoothCallCleared(currentCall);
        }

        this.calls.delete(phoneNumber);
    }

    @Rpc(RpcServerEvent.PHONE_SIMCARD_CALLS_END)
    async endCall(source: number, phoneNumber: string) {
        const currentCall = this.calls.get(phoneNumber);
        if (!currentCall) {
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, source, null);
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, source);
            return Err('Call not found');
        }

        const transmitterCall = this.calls.get(currentCall?.transmitter);

        await this.prismaService.phone_calls.updateMany({
            where: { identifier: currentCall.identifier },
            data: { end: new Date() },
        });

        if (currentCall.transmitterSource !== null) {
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, currentCall.transmitterSource, null);
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, currentCall.transmitterSource);
        }

        if (
            currentCall.receiverSource !== null &&
            currentCall.receiverSource !== 0 &&
            currentCall?.identifier === transmitterCall?.identifier &&
            (currentCall?.is_accepted || !this.isReceiverIsBusy(transmitterCall?.receiver))
        ) {
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, currentCall.receiverSource, null);
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, currentCall.receiverSource);
        }

        if (currentCall.is_accepted) {
            TriggerEvent(ServerEvent.VOIP_PHONE_CALL_END, source);
        } else {
            this.notifyBoothCallCleared(currentCall);
        }

        this.calls.delete(phoneNumber);
    }

    public async declineBoothRing(callerPhone: string) {
        const currentCall = this.calls.get(callerPhone);
        if (!currentCall) {
            return;
        }

        await this.prismaService.phone_calls.updateMany({
            where: { identifier: currentCall.identifier },
            data: { is_accepted: 0, end: new Date() },
        });

        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, currentCall.transmitterSource, null);
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, currentCall.transmitterSource);

        this.calls.delete(callerPhone);
    }

    private notifyBoothCallCleared(call: ActiveCall) {
        if (this.phoneBoothState.isBoothNumber(call.receiver)) {
            TriggerEvent(ServerEvent.PHONE_BOOTH_RING_STOP, call.receiver);
        }

        if (this.phoneBoothState.isBoothNumber(call.transmitter)) {
            TriggerEvent(ServerEvent.PHONE_BOOTH_RING_STOP, call.transmitter);
        }
    }

    @Rpc(RpcServerEvent.PHONE_SIMCARD_CALLS_MUTE)
    async muteCall(source: number, phoneNumber: string, muted: boolean) {
        const currentCall = this.calls.get(phoneNumber);
        if (!currentCall) {
            return Err('Call not found');
        }

        const isTransmitter = currentCall.transmitterSource === source;
        const targetSource = isTransmitter ? currentCall.receiverSource : currentCall.transmitterSource;

        TriggerClientEvent(ClientEvent.VOIP_VOICE_MUTE_CALL, targetSource, muted);
        TriggerEvent(ServerEvent.VOIP_PHONE_CALL_MUTED, source, muted);
    }

    public async ringBooth(player: PlayerData, boothNumber: string): Promise<Result<string, string>> {
        if (this.calls.has(player.charinfo.phone) || this.playerAlreadyInCall(player.source)) {
            return Err('busy');
        }

        const identifier = uuidv4();
        const call: ActiveCall = {
            identifier,
            transmitter: player.charinfo.phone,
            transmitterSource: player.source,
            receiver: boothNumber,
            receiverSource: null,
            start: Date.now(),
            end: Date.now(),
            is_accepted: false,
        };

        this.calls.set(player.charinfo.phone, call);

        await this.prismaService.phone_calls.create({
            data: {
                identifier,
                transmitter: call.transmitter,
                receiver: call.receiver,
                start: new Date(call.start),
                end: new Date(call.end),
                is_accepted: 0,
            },
        });

        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, player.source, { ...call, isTransmitter: true });
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_INIT, player.source);
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, player.source);

        TriggerEvent(ServerEvent.PHONE_BOOTH_RING, boothNumber, player.charinfo.phone);

        return Ok('success');
    }

    public async acceptBoothCall(source: number, boothNumber: string): Promise<Result<string, string>> {
        const entry = Array.from(this.calls.entries()).find(
            ([, call]) => call.receiver === boothNumber && !call.is_accepted
        );

        if (!entry) {
            return Err('no-ringing-call');
        }

        const [callKey, currentCall] = entry;

        currentCall.receiverSource = source;
        currentCall.is_accepted = true;

        await this.prismaService.phone_calls.updateMany({
            where: { identifier: currentCall.identifier },
            data: { is_accepted: 1 },
        });

        TriggerEvent(
            ServerEvent.VOIP_PHONE_CALL_START,
            currentCall.transmitter,
            currentCall.receiver,
            currentCall.transmitterSource,
            currentCall.receiverSource
        );

        this.sendCallDataToClients(currentCall);

        return Ok(callKey);
    }

    public async initCallFromBooth(
        source: number,
        boothNumber: string,
        targetPhoneNumber: string
    ): Promise<Result<string, string>> {
        if (this.calls.has(boothNumber)) {
            return Err('busy');
        }

        const targetPlayer = this.playerService.getPlayerByPhone(targetPhoneNumber);
        const isServiceNumber = /^555-\d{4}$/.test(targetPhoneNumber);

        if (!isServiceNumber && (!targetPlayer || this.playerAlreadyInCall(targetPlayer.source))) {
            return Err('unavailable');
        }

        const identifier = uuidv4();
        const call: ActiveCall = {
            identifier,
            transmitter: boothNumber,
            transmitterSource: source,
            receiver: targetPlayer ? targetPlayer.charinfo.phone : targetPhoneNumber,
            receiverSource: targetPlayer ? targetPlayer.source : null,
            start: Date.now(),
            end: Date.now(),
            is_accepted: false,
        };

        this.calls.set(boothNumber, call);

        await this.prismaService.phone_calls.create({
            data: {
                identifier,
                transmitter: call.transmitter,
                receiver: call.receiver,
                start: new Date(call.start),
                end: new Date(call.end),
                is_accepted: 0,
            },
        });

        if (targetPlayer) {
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, targetPlayer.source, {
                ...call,
                isTransmitter: false,
            });
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_RECEIVE, targetPlayer.source);
            TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, targetPlayer.source);
        }

        return Ok('success');
    }

    private playerAlreadyInCall(source: number) {
        return Array.from(this.calls.values()).find(
            call => call.transmitterSource === source || call.receiverSource === source
        );
    }

    private isReceiverIsBusy(receiver: string) {
        return (
            Object.values(this.calls).find(
                call => (call.transmitter === receiver || call.receiver === receiver) && call.is_accepted
            ) !== undefined
        );
    }

    private sendCallDataToClients(call: ActiveCall) {
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, call.transmitterSource, {
            ...call,
            isTransmitter: true,
        });
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_UPDATE, call.receiverSource, {
            ...call,
            isTransmitter: false,
        });

        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, call.transmitterSource);
        TriggerClientEvent(ClientEvent.PHONE_SIMCARD_CALLS_HISTORY, call.receiverSource);
    }
}
