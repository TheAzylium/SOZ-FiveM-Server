import { fetchNui } from '@public/nui/fetch';
import { useCallback } from 'react';

import { NuiEvent } from '../../../../../../shared/event/nui';
import { ZDropDevice, ZDropSendResult } from '../../../../../../shared/phone/apps/zdrop';
import { useDynamicIsland } from '../../dynamic-island/hooks/useDynamicIsland';
import { useSetZDropPickerDevices, useSetZDropPickerPayload } from '../zdrop.atom';
import { ZDropPickerPayload } from '../zdrop.types';

export const useZDropAPI = () => {
    const { sendIsland } = useDynamicIsland();
    const setPayload = useSetZDropPickerPayload();
    const setDevices = useSetZDropPickerDevices();

    const openZDropPicker = useCallback(
        async (payload: ZDropPickerPayload) => {
            setPayload(payload);

            try {
                const devices = await fetchNui<void, ZDropDevice[]>(NuiEvent.PhoneAppZDropGetNearby);
                setDevices(devices);
            } catch (e) {
                sendIsland('error');
            }
        },
        [setPayload, setDevices, sendIsland]
    );

    const closeZDropPicker = useCallback(() => {
        setPayload(null);
        setDevices([]);
    }, [setPayload, setDevices]);

    const sendZDrop = useCallback(
        async (payload: ZDropPickerPayload, targets: number[]) => {
            try {
                const result =
                    payload.type === 'contact'
                        ? await fetchNui<{ targets: number[]; contactId: number }, ZDropSendResult>(
                              NuiEvent.PhoneAppZDropRequestContact,
                              { targets, contactId: payload.contactId }
                          )
                        : await fetchNui<{ targets: number[]; photoId: number }, ZDropSendResult>(
                              NuiEvent.PhoneAppZDropRequestPhoto,
                              { targets, photoId: payload.photoId }
                          );

                sendIsland(result.failed.length === 0 ? 'success' : 'error');
            } catch (e) {
                sendIsland('error');
            }
        },
        [sendIsland]
    );

    const acceptZDropRequest = useCallback(
        async (requestId: string) => {
            try {
                await fetchNui(NuiEvent.PhoneAppZDropAcceptRequest, requestId);
                sendIsland('success');
            } catch (e) {
                sendIsland('error');
            }
        },
        [sendIsland]
    );

    const declineZDropRequest = useCallback(
        async (requestId: string) => {
            try {
                await fetchNui(NuiEvent.PhoneAppZDropDeclineRequest, requestId);
                sendIsland('success');
            } catch (e) {
                sendIsland('error');
            }
        },
        [sendIsland]
    );

    return { openZDropPicker, closeZDropPicker, sendZDrop, acceptZDropRequest, declineZDropRequest };
};
