import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

import { Button } from '../../../components/Button';
import { useThemeConfig } from '../../config/config.atom';
import { useZDropAPI } from '../hooks/useZDropAPI';
import { useSetZDropIncomingRequest, useZDropIncomingRequest } from '../zdrop.atom';

export const ZDropRequestModal = () => {
    const { t } = useTranslation();
    const request = useZDropIncomingRequest();
    const setRequest = useSetZDropIncomingRequest();
    const theme = useThemeConfig();
    const { acceptZDropRequest, declineZDropRequest } = useZDropAPI();

    if (!request) return null;

    const handleAccept = async () => {
        await acceptZDropRequest(request.requestId);
        setRequest(null);
    };

    const handleDecline = async () => {
        await declineZDropRequest(request.requestId);
        setRequest(null);
    };

    return (
        <div className="absolute flex justify-center items-center z-50 inset-0">
            <div
                className={clsx('w-4/5 rounded-2xl', {
                    'bg-ios-800 bg-opacity-85 text-white': theme === 'dark',
                    'bg-white bg-opacity-85 text-black': theme === 'light',
                })}
            >
                <div className="pt-5 px-5 text-center">
                    <div className="font-bold">{t('ZDROP.INCOMING_TITLE', { name: request.fromName })}</div>
                    <div className="text-[.9rem] py-2">
                        {request.type === 'photo' ? (
                            <img className="mx-auto rounded-lg max-h-40" src={request.preview} alt="" />
                        ) : (
                            request.preview
                        )}
                    </div>
                </div>

                <div className="flex border-t border-white border-opacity-80 divide-x divide-white divide-opacity-80">
                    <Button className="grow p-2 text-center text-red-500" onClick={handleDecline}>
                        {t('ZDROP.DECLINE')}
                    </Button>
                    <Button className="grow p-2 text-center text-blue-500" onClick={handleAccept}>
                        {t('ZDROP.ACCEPT')}
                    </Button>
                </div>
            </div>
        </div>
    );
};
