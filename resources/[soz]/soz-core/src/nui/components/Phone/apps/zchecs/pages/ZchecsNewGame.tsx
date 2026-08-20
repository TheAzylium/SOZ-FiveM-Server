import clsx from 'clsx';
import React, { FunctionComponent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useAppTitleGetBackUpdater } from '../../../system/apps/hooks/useAppTitleGetBackUpdater';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsProfile } from '../zchecs.atom';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '<'];

export const ZchecsNewGame: FunctionComponent = () => {
    const navigate = useNavigate();
    const theme = useThemeConfig();

    const profile = useZchecsProfile();
    const { createGame, joinQueue, leaveQueue, refresh } = useZchecsAPI();

    const [digits, setDigits] = useState('');
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
        const result = await createGame(`555-${digits}`);
        setBusy(false);

        if (!result.ok) {
            setError(result.error ?? 'Impossible de créer la partie');

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
            setError(result.error ?? 'Impossible de rejoindre la file');

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
            <AppTitle title="Nouvelle partie" />
            <AppContent>
                <p className="text-xs text-gray-500 mb-2">Partie amicale — sans impact sur l&apos;ELO</p>

                <div
                    className={clsx('rounded-xl px-4 py-4 mb-3 text-center shadow', {
                        'bg-ios-700 text-white': theme === 'dark',
                        'bg-white text-black': theme === 'light',
                    })}
                >
                    <span className="text-3xl font-light tracking-widest">555-{digits.padEnd(4, '·')}</span>
                </div>

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
                    Envoyer le défi
                </button>

                <div className="h-px bg-gray-500/30 my-5" />

                <p className="text-xs text-gray-500 mb-2">Partie classée — adversaire aléatoire, ELO en jeu</p>

                <button
                    type="button"
                    disabled={busy}
                    onClick={submitRanked}
                    className={clsx('w-full rounded-xl py-2.5 font-medium', {
                        'bg-gray-500/40': profile.inQueue,
                        'bg-[#347DD9] text-white': !profile.inQueue,
                    })}
                >
                    {profile.inQueue ? 'Annuler la recherche' : 'Chercher un adversaire'}
                </button>

                <p className="text-[11px] text-gray-500 mt-2">
                    Tu restes dans la file même hors ligne : la partie démarre dès qu&apos;un autre joueur cherche.
                </p>

                {error && <p className="text-sm text-red-400 mt-4 text-center">{error}</p>}

                <div className="h-24" />
            </AppContent>
        </AppWrapper>
    );
};
