import { fetchNui } from '@public/nui/fetch';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { NuiEvent } from '../../../../../../shared/event/nui';
import { SocietyMessage } from '../../../../../../shared/phone/apps/society';
import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useAppTitleGetBackUpdater } from '../../../system/apps/hooks/useAppTitleGetBackUpdater';
import { useThemeConfig } from '../../../system/config/config.atom';
import { SentMessageItem } from '../components/SentMessageItem';

export const SentMessagesHistory: FunctionComponent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useThemeConfig();

    const [messages, setMessages] = useState<SocietyMessage[]>([]);

    useAppTitleGetBackUpdater(() => navigate(-1));

    useEffect(() => {
        fetchNui<void, SocietyMessage[]>(NuiEvent.PhoneAppSocietyGetSentMessages).then(setMessages);
    }, []);

    return (
        <AppWrapper scrollable>
            <AppTitle title={t('SOCIETY_CONTACTS.HISTORY_TITLE')} isBigHeader={false} />
            <AppContent>
                {messages.length === 0 ? (
                    <div className={theme === 'dark' ? 'text-white text-center' : 'text-black text-center'}>
                        {t('SOCIETY_CONTACTS.HISTORY_EMPTY')}
                    </div>
                ) : (
                    messages.map(message => <SentMessageItem key={message.id} message={message} />)
                )}
            </AppContent>
        </AppWrapper>
    );
};
