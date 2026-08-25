import clsx from 'clsx';
import React, { FunctionComponent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
    ZCHECS_TIME_CONTROLS,
    ZCHECS_VARIANT_LABELS,
    ZchecsTimeControl,
    ZchecsVariant,
} from '../../../../../../shared/phone/apps/zchecs';
import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useAppTitleGetBackUpdater } from '../../../system/apps/hooks/useAppTitleGetBackUpdater';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsProfile } from '../zchecs.atom';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'];

export const ZchecsNewGame: FunctionComponent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useThemeConfig();

    const profile = useZchecsProfile();
    const { createGame, joinQueue, leaveQueue, refresh } = useZchecsAPI();

    const [digits, setDigits] = useState('');
    const [timeControl, setTimeControl] = useState<ZchecsTimeControl>('CORRESPONDENCE');
    const [variant, setVariant] = useState<ZchecsVariant>('STANDARD');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useAppTitleGetBackUpdater(() => navigate('/zchecs'));

    const press = (key: string) => {
        setError(null);

        if (key === '<') {
            setDigits(prev => prev.slice(0, -1));

            return;
        }

        setDigits(prev => (prev.length >= 4 ? prev : prev + key));
    };

    const submitInvite = async () => {
        if (digits.length !== 4 || busy) {
            return;
        }

        setBusy(true);
        const result = await createGame({ number: `555-${digits}`, timeControl, variant });
        setBusy(false);

        if (!result.ok) {
            setError(result.error ?? t('ZCHECS.CREATE_FAILED'));

            return;
        }

        setDigits('');
        navigate('/zchecs');
    };

    const submitRanked = async () => {
        if (busy) {
            return;
        }

        setBusy(true);

        if (profile.inQueue) {
            await leaveQueue();
            await refresh();
            setBusy(false);

            return;
        }

        const result = await joinQueue();
        setBusy(false);

        if (!result.ok) {
            setError(result.error ?? t('ZCHECS.QUEUE_FAILED'));

            return;
        }

        // Un adversaire attendait déjà: la partie démarre tout de suite.
        if (result.game) {
            navigate(`/zchecs/game/${result.game.id}`);

            return;
        }

        navigate('/zchecs');
    };

    return (
        <AppWrapper scrollable>
            <AppTitle title={t('ZCHECS.NEW_GAME')} />
            <AppContent>
                <p className="text-xs text-gray-500 mb-2">{t('ZCHECS.CASUAL_HINT')}</p>

                <div
                    className={clsx('rounded-xl px-4 py-4 mb-3 text-center shadow', {
                        'bg-ios-700 text-white': theme === 'dark',
                        'bg-white text-black': theme === 'light',
                    })}
                >
                    <span className="text-3xl font-light tracking-widest">555-{digits.padEnd(4, '·')}</span>
                </div>

                <ModeSelector<ZchecsTimeControl>
                    label={t('ZCHECS.TIME_CONTROL')}
                    value={timeControl}
                    options={Object.keys(ZCHECS_TIME_CONTROLS) as ZchecsTimeControl[]}
                    render={key => ZCHECS_TIME_CONTROLS[key].label}
                    onChange={setTimeControl}
                />

                <ModeSelector<ZchecsVariant>
                    label={t('ZCHECS.VARIANT')}
                    value={variant}
                    options={Object.keys(ZCHECS_VARIANT_LABELS) as ZchecsVariant[]}
                    render={key => ZCHECS_VARIANT_LABELS[key]}
                    onChange={setVariant}
                />

                <div className="grid grid-cols-3 gap-2 mb-3">
                    {KEYS.map((key, index) =>
                        key === '' ? (
                            <span key={index} />
                        ) : (
                            <button
                                key={index}
                                type="button"
                                onClick={() => press(key)}
                                className={clsx('rounded-xl py-3 text-xl shadow', {
                                    'bg-ios-700 text-white': theme === 'dark',
                                    'bg-white text-black': theme === 'light',
                                })}
                            >
                                {key === '<' ? '⌫' : key}
                            </button>
                        )
                    )}
                </div>

                <button
                    type="button"
                    disabled={digits.length !== 4 || busy}
                    onClick={submitInvite}
                    className={clsx('w-full rounded-xl py-2.5 font-medium text-white', {
                        'bg-[#347DD9]': digits.length === 4 && !busy,
                        'bg-gray-500/40 cursor-not-allowed': digits.length !== 4 || busy,
                    })}
                >
                    {t('ZCHECS.SEND_CHALLENGE')}
                </button>

                <div className="h-px bg-gray-500/30 my-5" />

                <p className="text-xs text-gray-500 mb-2">{t('ZCHECS.RANKED_HINT')}</p>

                <button
                    type="button"
                    disabled={busy}
                    onClick={submitRanked}
                    className={clsx('w-full rounded-xl py-2.5 font-medium', {
                        'bg-gray-500/40': profile.inQueue,
                        'bg-[#347DD9] text-white': !profile.inQueue,
                    })}
                >
                    {t(profile.inQueue ? 'ZCHECS.QUEUE_CANCEL' : 'ZCHECS.QUEUE_SEARCH')}
                </button>

                <p className="text-[11px] text-gray-500 mt-2">
                    {t('ZCHECS.QUEUE_HINT')}
                </p>

                {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}

                <div className="h-24" />
            </AppContent>
        </AppWrapper>
    );
};

/** Sélecteur compact en pilules, réservé aux parties amicales. */
function ModeSelector<T extends string>({
    label,
    value,
    options,
    render,
    onChange,
}: {
    label: string;
    value: T;
    options: T[];
    render: (option: T) => string;
    onChange: (option: T) => void;
}) {
    const theme = useThemeConfig();

    return (
        <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {options.map(option => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onChange(option)}
                        className={clsx('rounded-lg px-2.5 py-1 text-xs', {
                            'bg-[#347DD9] text-white': option === value,
                            'bg-ios-700 text-gray-300': option !== value && theme === 'dark',
                            'bg-white text-gray-700': option !== value && theme === 'light',
                        })}
                    >
                        {render(option)}
                    </button>
                ))}
            </div>
        </div>
    );
}
