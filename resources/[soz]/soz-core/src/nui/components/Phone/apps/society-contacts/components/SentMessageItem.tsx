import clsx from 'clsx';
import React, { FunctionComponent } from 'react';

import { SocietyMessage } from '../../../../../../shared/phone/apps/society';
import { useAssetPath } from '../../../../../hook/assets';
import { ContactPicture } from '../../../components/ContactPicture';
import { DayAgo } from '../../../components/DayAgo';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useSocietyContact } from '../hooks/useContact';

export const SentMessageItem: FunctionComponent<{ message: SocietyMessage }> = ({ message }) => {
    const theme = useThemeConfig();
    const contact = useSocietyContact(message.conversation_id);
    const { getPath } = useAssetPath();

    return (
        <div className="my-1">
            <div
                className={clsx('flex flex-col grow gap-4 rounded-lg p-4 min-w-0', {
                    'bg-phone-900 text-white': theme === 'dark',
                    'bg-white text-black': theme === 'light',
                })}
            >
                <div className="flex justify-between">
                    <div className="flex items-center gap-2">
                        {contact?.avatar && <ContactPicture picture={getPath('images/society/' + contact.avatar)} />}
                        <span
                            className={clsx('rounded-full px-3 text-sm', {
                                'bg-gray-200': theme === 'light',
                                'bg-gray-600': theme === 'dark',
                            })}
                        >
                            {contact?.display ?? message.conversation_id}
                        </span>
                    </div>
                    <div className="flex flex-col items-end text-left text-xs text-gray-400">
                        {message.isDone ? (
                            <span>L'appel est fini !</span>
                        ) : message.isTaken ? (
                            <span>Votre appel a été pris</span>
                        ) : (
                            <span>En attente...</span>
                        )}
                        <span>
                            <DayAgo timestamp={message.createdAt} />
                        </span>
                    </div>
                </div>

                <p
                    className={clsx('text-left mt-[4px] text-sm font-medium break-words whitespace-pre-wrap', {
                        'text-gray-100': theme === 'dark',
                        'text-gray-700': theme === 'light',
                    })}
                >
                    {message.message}
                </p>
            </div>
        </div>
    );
};
