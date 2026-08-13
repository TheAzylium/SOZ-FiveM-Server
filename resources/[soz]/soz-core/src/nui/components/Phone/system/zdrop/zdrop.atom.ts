import { atom, useAtomValue } from 'jotai';
import { useSetAtom } from 'jotai/index';
import { useEffect } from 'react';

import { NuiEvent } from '../../../../../shared/event/nui';
import { ZDropDevice, ZDropIncomingRequest } from '../../../../../shared/phone/apps/zdrop';
import { fetchNui } from '../../../../fetch';
import { useNuiEvent } from '../../../../hook/nui';
import { useConfig } from '../config/config.atom';
import { ZDropPickerPayload } from './zdrop.types';

const incomingRequestAtom = atom(null as ZDropIncomingRequest | null);
const pickerPayloadAtom = atom(null as ZDropPickerPayload | null);
const pickerDevicesAtom = atom<ZDropDevice[]>([]);

export const useZDropIncomingRequest = () => useAtomValue(incomingRequestAtom);
export const useZDropPickerPayload = () => useAtomValue(pickerPayloadAtom);
export const useZDropPickerDevices = () => useAtomValue(pickerDevicesAtom);

export const useSetZDropIncomingRequest = () => useSetAtom(incomingRequestAtom);
export const useSetZDropPickerPayload = () => useSetAtom(pickerPayloadAtom);
export const useSetZDropPickerDevices = () => useSetAtom(pickerDevicesAtom);

export const useAppZDropStateHandlers = () => {
    const setIncomingRequest = useSetAtom(incomingRequestAtom);
    const config = useConfig();

    useNuiEvent('phone', 'ZDropIncomingRequest', setIncomingRequest);
    useNuiEvent('phone', 'ZDropCancelled', () => setIncomingRequest(null));

    useEffect(() => {
        fetchNui(NuiEvent.PhoneAppZDropSetDiscoverable, config.zdropEnabled);
    }, [config.zdropEnabled]);

    useEffect(() => {
        fetchNui(NuiEvent.PhoneAppZDropSetPlaneMode, config.planeMode);
    }, [config.planeMode]);
};
