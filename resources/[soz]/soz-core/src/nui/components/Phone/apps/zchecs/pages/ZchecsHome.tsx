import clsx from 'clsx';
import React, { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useApp } from '../../../system/apps/hooks/useApp';
import { useThemeConfig } from '../../../system/config/config.atom';
import { ZchecsGameRow } from '../components/ZchecsGameRow';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import {
    useZchecsFinishedGames,
    useZchecsInvitations,
    useZchecsMyTurnGames,
    useZchecsProfile,
    useZchecsWaitingGames,
} from '../zchecs.atom';

export const ZchecsHome: FunctionComponent = () => {
    const navigate = useNavigate();
    const theme = useThemeConfig();
    const app = useApp('zchecs');

    const profile = useZchecsProfile();
    const invitations = useZchecsInvitations();
    const myTurn = useZchecsMyTurnGames();
    const waiting = useZchecsWaitingGames();
    const finished = useZchecsFinishedGames();

    const { refresh, acceptGame, declineGame, leaveQueue } = useZchecsAPI();

    useEffect(() => {
        refresh();
    }, []);

    const isEmpty = invitations.length + myTurn.length + waiting.length + finished.length === 0;

    return (
        <AppWrapper scrollable>
            <AppTitle app={app} isBigHeader />
            <AppContent>
                <div
                    className={clsx('flex items-center justify-between rounded-xl px-4 py-3 mb-4 shadow', {
                        'bg-ios-700 text-white': theme === 'dark',
                        'bg-white text-black': theme === 'light',
                    })}
                >
                    <div>
                        <p className="text-2xl font-semibold">{profile.elo}</p>
                        <p className="text-xs text-gray-400">
                            {profile.wins}V · {profile.losses}D · {profile.draws}N
                        </p>
                    </div>
                    <button
                        type="button"
                        className="text-sm text-[#347DD9]"
                        onClick={() => navigate('/zchecs/leaderboard')}
                    >
                        Classement
                    </button>
                </div>

                <button
                    type="button"
                    className="w-full rounded-xl bg-[#347DD9] text-white py-2.5 mb-2 font-medium"
                    onClick={() => navigate('/zchecs/new')}
                >
                    Nouvelle partie
                </button>

                {profile.inQueue && (
                    <button
                        type="button"
                        className="w-full rounded-xl bg-gray-500/40 py-2 mb-4 text-sm"
                        onClick={async () => {
                            await leaveQueue();
                            await refresh();
                        }}
                    >
                        Recherche d&apos;adversaire en cours · Annuler
                    </button>
                )}

                {!profile.inQueue && <div className="mb-2" />}

                {isEmpty && (
                    <p className="text-center text-sm text-gray-500 mt-10">
                        Aucune partie pour le moment.
                        <br />
                        Lance un défi vers un numéro 555-xxxx.
                    </p>
                )}

                <Section title="Invitations reçues" count={invitations.length}>
                    {invitations.map(game => (
                        <ZchecsGameRow
                            key={game.id}
                            game={game}
                            onAccept={id => acceptGame(id)}
                            onDecline={id => declineGame(id)}
                        />
                    ))}
                </Section>

                <Section title="À toi de jouer" count={myTurn.length}>
                    {myTurn.map(game => (
                        <ZchecsGameRow key={game.id} game={game} />
                    ))}
                </Section>

                <Section title="En attente" count={waiting.length}>
                    {waiting.map(game => (
                        <ZchecsGameRow key={game.id} game={game} />
                    ))}
                </Section>

                <Section title="Terminées" count={finished.length}>
                    {finished.map(game => (
                        <ZchecsGameRow key={game.id} game={game} />
                    ))}
                </Section>

                <div className="h-24" />
            </AppContent>
        </AppWrapper>
    );
};

const Section: FunctionComponent<PropsWithChildren<{ title: string; count: number }>> = ({
    title,
    count,
    children,
}) => {
    if (count === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5 px-1">
                {title} ({count})
            </h3>
            {children}
        </div>
    );
};
