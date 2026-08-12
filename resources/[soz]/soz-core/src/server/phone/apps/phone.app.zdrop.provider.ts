import { Provider } from '@public/core/decorators/provider';

import { On } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Rpc } from '../../../core/decorators/rpc';
import { uuidv4 } from '../../../core/utils';
import { ClientEvent } from '../../../shared/event';
import { ZDropContentType, ZDropDevice, ZDropSendResult } from '../../../shared/phone/apps/zdrop';
import { PlayerData } from '../../../shared/player';
import { getDistance, Vector3 } from '../../../shared/polyzone/vector';
import { RpcServerEvent } from '../../../shared/rpc';
import { PrismaService } from '../../database/prisma.service';
import { PlayerService } from '../../player/player.service';
import { PhoneLightRepository } from '../../repository/phone.light.repository';
import { ServerStateService } from '../../server.state.service';

const ZDROP_RANGE = 5.0;
const ZDROP_REQUEST_TTL = 30_000;

type PendingRequestData = { display: string; number: string } | { image: string };

type PendingRequest = {
    fromSource: number;
    toSource: number;
    type: ZDropContentType;
    data: PendingRequestData;
    timeout: NodeJS.Timeout;
};

@Provider()
export class PhoneAppZDropProvider {
    @Inject(PrismaService)
    private readonly prismaService: PrismaService;

    @Inject(PlayerService)
    private readonly playerService: PlayerService;

    @Inject(PhoneLightRepository)
    private readonly phoneLightRepository: PhoneLightRepository;

    @Inject(ServerStateService)
    private readonly serverStateService: ServerStateService;

    private pendingRequests = new Map<string, PendingRequest>();

    @Rpc(RpcServerEvent.PHONE_APP_ZDROP_GET_NEARBY)
    async getNearby(source: number): Promise<ZDropDevice[]> {
        const requester = this.playerService.getPlayer(source);
        if (!requester) {
            return [];
        }

        const devices: ZDropDevice[] = [];

        for (const candidate of this.serverStateService.getPlayers()) {
            if (!this.isReachable(source, candidate.source)) {
                continue;
            }

            const profile = await this.prismaService.phone_profile.findFirst({
                where: { number: candidate.charinfo.phone },
                select: { avatar: true, name: true },
            });

            devices.push({
                playerId: candidate.source,
                name: profile?.name ?? `Zphone-${candidate.charinfo.firstname}`,
                avatar: profile?.avatar ?? null,
            });
        }

        return devices;
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZDROP_REQUEST_CONTACT)
    async requestContact(source: number, targets: number[], contactId: number) {
        const sender = this.playerService.getPlayer(source);
        if (!sender) {
            return { sent: [], failed: targets };
        }

        const contact = await this.prismaService.phone_contacts.findFirst({
            where: { id: contactId, identifier: sender.citizenid },
        });

        if (!contact) {
            return { sent: [], failed: targets };
        }

        return this.dispatchRequests(source, sender, targets, 'contact', contact.display, {
            display: contact.display,
            number: contact.number,
        });
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZDROP_REQUEST_PHOTO)
    async requestPhoto(source: number, targets: number[], photoId: number) {
        const sender = this.playerService.getPlayer(source);
        if (!sender) {
            return { sent: [], failed: targets };
        }

        const photo = await this.prismaService.phone_gallery.findFirst({
            where: { id: photoId, identifier: sender.citizenid },
        });

        if (!photo) {
            return { sent: [], failed: targets };
        }

        return this.dispatchRequests(source, sender, targets, 'photo', photo.image, {
            image: photo.image,
        });
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZDROP_CANCEL_REQUEST)
    cancelRequest(source: number, requestId: string) {
        const request = this.pendingRequests.get(requestId);
        if (!request || request.fromSource !== source) {
            return false;
        }

        clearTimeout(request.timeout);
        this.pendingRequests.delete(requestId);

        TriggerClientEvent(ClientEvent.PHONE_APP_ZDROP_CANCELLED, request.toSource, { requestId });

        return true;
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZDROP_ACCEPT_REQUEST)
    async acceptRequest(source: number, requestId: string) {
        const request = this.pendingRequests.get(requestId);
        if (!request || request.toSource !== source) {
            return false;
        }

        const receiver = this.playerService.getPlayer(source);
        if (!receiver) {
            return false;
        }

        clearTimeout(request.timeout);
        this.pendingRequests.delete(requestId);

        if (request.type === 'contact') {
            const data = request.data as { display: string; number: string };
            const contact = await this.prismaService.phone_contacts.create({
                data: {
                    identifier: receiver.citizenid,
                    display: data.display,
                    number: data.number,
                },
            });

            TriggerClientEvent(ClientEvent.PHONE_APP_ZDROP_DELIVERED, source, { type: 'contact', contact });
        } else if (request.type === 'photo') {
            const data = request.data as { image: string };
            const photo = await this.prismaService.phone_gallery.create({
                data: {
                    identifier: receiver.citizenid,
                    image: data.image,
                },
            });

            TriggerClientEvent(ClientEvent.PHONE_APP_ZDROP_DELIVERED, source, { type: 'photo', photo });
        } else {
            return false;
        }

        TriggerClientEvent(ClientEvent.PHONE_APP_ZDROP_RESULT, request.fromSource, { requestId, accepted: true });

        return true;
    }

    @Rpc(RpcServerEvent.PHONE_APP_ZDROP_DECLINE_REQUEST)
    declineRequest(source: number, requestId: string) {
        const request = this.pendingRequests.get(requestId);
        if (!request || request.toSource !== source) {
            return false;
        }

        clearTimeout(request.timeout);
        this.pendingRequests.delete(requestId);

        TriggerClientEvent(ClientEvent.PHONE_APP_ZDROP_RESULT, request.fromSource, { requestId, accepted: false });

        return true;
    }

    @On('playerDropped')
    onPlayerDropped(source: number) {
        for (const [requestId, request] of this.pendingRequests) {
            if (request.fromSource === source || request.toSource === source) {
                clearTimeout(request.timeout);
                this.pendingRequests.delete(requestId);
            }
        }
    }

    private async dispatchRequests(
        source: number,
        sender: PlayerData,
        targets: number[],
        type: ZDropContentType,
        preview: string,
        data: PendingRequestData
    ): Promise<ZDropSendResult> {
        const sent: { target: number; requestId: string }[] = [];
        const failed: number[] = [];

        const senderProfile = await this.prismaService.phone_profile.findFirst({
            where: { number: sender.charinfo.phone },
            select: { name: true },
        });
        const fromName = senderProfile?.name ?? `Zphone-${sender.charinfo.firstname}`;

        for (const target of targets) {
            if (!this.isReachable(source, target)) {
                failed.push(target);
                continue;
            }

            const requestId = uuidv4();
            const timeout = setTimeout(() => this.pendingRequests.delete(requestId), ZDROP_REQUEST_TTL);

            this.pendingRequests.set(requestId, { fromSource: source, toSource: target, type, data, timeout });

            TriggerClientEvent(ClientEvent.PHONE_APP_ZDROP_INCOMING, target, {
                requestId,
                fromName,
                type,
                preview,
            });

            sent.push({ target, requestId });
        }

        return { sent, failed };
    }

    private isReachable(source: number, target: number): boolean {
        if (target === source) {
            return false;
        }

        const targetState = Player(target).state;
        if (!targetState.zdropDiscoverable || targetState.zdropPlaneMode) {
            return false;
        }

        if (!this.playerService.getPlayer(target) || !this.phoneLightRepository.hasPhoneOut(target)) {
            return false;
        }

        const sourcePosition = GetEntityCoords(GetPlayerPed(source)) as Vector3;
        const targetPosition = GetEntityCoords(GetPlayerPed(target)) as Vector3;

        return getDistance(sourcePosition, targetPosition) <= ZDROP_RANGE;
    }
}
