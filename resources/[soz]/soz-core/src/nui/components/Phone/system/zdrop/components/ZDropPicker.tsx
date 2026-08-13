import { animated, useSpring } from '@react-spring/web';
import React, { FunctionComponent, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ContactPicture } from '../../../components/ContactPicture';
import { ActionSheetContainer } from '../../action-sheet/components/ActionSheetContainer';
import { ActionSheetItem, ActionSheetTitle } from '../../action-sheet/components/ActionSheetItems';
import { useZDropAPI } from '../hooks/useZDropAPI';
import { useZDropPickerDevices, useZDropPickerPayload } from '../zdrop.atom';

export const ZDropPicker: FunctionComponent = () => {
    const { t } = useTranslation();
    const payload = useZDropPickerPayload();
    const devices = useZDropPickerDevices();
    const { closeZDropPicker, sendZDrop } = useZDropAPI();

    const [selected, setSelected] = useState<number[]>([]);

    const open = payload !== null;

    const styles = useSpring({
        from: {
            opacity: 0,
            transform: 'translateY(100%)',
        },
        to: {
            opacity: open ? 1 : 0,
            transform: open ? 'translateY(0%)' : 'translateY(100%)',
        },
    });

    const toggleDevice = (playerId: number) => {
        setSelected(current =>
            current.includes(playerId) ? current.filter(id => id !== playerId) : [...current, playerId]
        );
    };

    const handleClose = () => {
        setSelected([]);
        closeZDropPicker();
    };

    const handleSend = async () => {
        if (!payload) {
            return;
        }

        await sendZDrop(payload, selected);
        setSelected([]);
        closeZDropPicker();
    };

    if (!open) {
        return null;
    }

    return (
        <animated.div style={styles} className="absolute bottom-10 inset-x-5 flex flex-col gap-2 z-50">
            <ActionSheetContainer>
                <ActionSheetTitle>{t('ZDROP.PICKER_TITLE')}</ActionSheetTitle>

                {devices.length === 0 && <ActionSheetItem>{t('ZDROP.NO_DEVICE_NEARBY')}</ActionSheetItem>}

                {devices.map(device => (
                    <ActionSheetItem
                        key={device.playerId}
                        selected={selected.includes(device.playerId)}
                        onClick={() => toggleDevice(device.playerId)}
                    >
                        <div className="flex items-center gap-2">
                            <ContactPicture picture={device.avatar ?? undefined} />
                            {device.name}
                        </div>
                    </ActionSheetItem>
                ))}
            </ActionSheetContainer>

            <ActionSheetContainer>
                <ActionSheetItem bold onClick={selected.length > 0 ? handleSend : undefined}>
                    {t('ZDROP.SEND')}
                </ActionSheetItem>
                <ActionSheetItem onClick={handleClose}>{t('ZDROP.CLOSE')}</ActionSheetItem>
            </ActionSheetContainer>
        </animated.div>
    );
};
