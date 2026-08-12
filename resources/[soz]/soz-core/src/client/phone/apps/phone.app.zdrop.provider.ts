import { Inject } from '@public/core/decorators/injectable';
import { Provider } from '@public/core/decorators/provider';

import { OnEvent, OnNuiEvent } from '../../../core/decorators/event';
import { emitRpc } from '../../../core/rpc';
import { ClientEvent } from '../../../shared/event/client';
import { NuiEvent } from '../../../shared/event/nui';
import { PhotoItem } from '../../../shared/phone/apps/photos';
import { ZDropDevice } from '../../../shared/phone/apps/zdrop';
import { Contact } from '../../../shared/phone/simcard';
import { RpcServerEvent } from '../../../shared/rpc';
import { Notifier } from '../../notifier';
import { NuiDispatch } from '../../nui/nui.dispatch';

@Provider()
export class PhoneAppZDropProvider {
    @Inject(NuiDispatch)
    private readonly nuiDispatch: NuiDispatch;

    @Inject(Notifier)
    private readonly notifier: Notifier;

    @OnNuiEvent(NuiEvent.PhoneAppZDropSetDiscoverable)
    async onZDropSetDiscoverable(enabled?: boolean) {
        LocalPlayer.state.set('zdropDiscoverable', Boolean(enabled), true);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropSetPlaneMode)
    async onZDropSetPlaneMode(enabled?: boolean) {
        LocalPlayer.state.set('zdropPlaneMode', Boolean(enabled), true);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropGetNearby)
    async onZDropGetNearby() {
        return emitRpc<ZDropDevice[]>(RpcServerEvent.PHONE_APP_ZDROP_GET_NEARBY);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropRequestContact)
    async onZDropRequestContact({ targets, contactId }: { targets: number[]; contactId: number }) {
        return emitRpc(RpcServerEvent.PHONE_APP_ZDROP_REQUEST_CONTACT, targets, contactId);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropRequestPhoto)
    async onZDropRequestPhoto({ targets, photoId }: { targets: number[]; photoId: number }) {
        return emitRpc(RpcServerEvent.PHONE_APP_ZDROP_REQUEST_PHOTO, targets, photoId);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropCancelRequest)
    async onZDropCancelRequest(requestId: string) {
        return emitRpc<boolean>(RpcServerEvent.PHONE_APP_ZDROP_CANCEL_REQUEST, requestId);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropAcceptRequest)
    async onZDropAcceptRequest(requestId: string) {
        return emitRpc<boolean>(RpcServerEvent.PHONE_APP_ZDROP_ACCEPT_REQUEST, requestId);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZDropDeclineRequest)
    async onZDropDeclineRequest(requestId: string) {
        return emitRpc<boolean>(RpcServerEvent.PHONE_APP_ZDROP_DECLINE_REQUEST, requestId);
    }

    @OnEvent(ClientEvent.PHONE_APP_ZDROP_INCOMING)
    onZDropIncoming(data: { requestId: string; fromName: string; type: 'contact' | 'photo'; preview: string }) {
        this.nuiDispatch.dispatch('phone', 'ZDropIncomingRequest', data);
    }

    @OnEvent(ClientEvent.PHONE_APP_ZDROP_RESULT)
    onZDropResult(data: { requestId: string; accepted: boolean }) {
        this.nuiDispatch.dispatch('phone', 'ZDropRequestResult', data);
        this.notifier.notify(
            data.accepted ? 'Votre Z-Drop a été accepté.' : 'Votre Z-Drop a été refusé.',
            data.accepted ? 'success' : 'info'
        );
    }

    @OnEvent(ClientEvent.PHONE_APP_ZDROP_CANCELLED)
    onZDropCancelled(data: { requestId: string }) {
        this.nuiDispatch.dispatch('phone', 'ZDropCancelled', data);
    }

    @OnEvent(ClientEvent.PHONE_APP_ZDROP_DELIVERED)
    onZDropDelivered(data: { type: 'contact'; contact: Contact } | { type: 'photo'; photo: PhotoItem }) {
        if (data.type === 'contact') {
            this.nuiDispatch.dispatch('phone', 'AddContact', data.contact);
            this.notifier.notify('Contact ajouté.', 'success');
        } else {
            this.nuiDispatch.dispatch('phone', 'AppPhotosAddData', data.photo);
            this.notifier.notify('Photo ajoutée.', 'success');
        }
    }
}
