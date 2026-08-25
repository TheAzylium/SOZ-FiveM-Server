import clsx from 'clsx';
import React, { FunctionComponent, PropsWithChildren, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
    isValidZchecsPseudo,
    ZCHECS_LEADERBOARD_MIN_GAMES,
    ZCHECS_PSEUDO_MAX,
} from '../../../../../../shared/phone/apps/zchecs';
import { DialogForm } from '../../../components/DialogForm';
import { TextField } from '../../../components/Input';
import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useGameFocus } from '../../../hooks/useGameFocus';
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
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useThemeConfig();
    const app = useApp('zchecs');

    const profile = useZchecsProfile();
    const invitations = useZchecsInvitations();
    const myTurn = useZchecsMyTurnGames();
    const waiting = useZchecsWaitingGames();
    const finished = useZchecsFinishedGames();

    const { refresh, acceptGame, declineGame, leaveQueue, setPseudo } = useZchecsAPI();

    const [pseudoOpen, setPseudoOpen] = useState(false);
    const [pseudoDraft, setPseudoDraft] = useState('');
    const [pseudoError, setPseudoError] = useState<string | null>(null);

    useEffect(() => {
        refresh();
    }, []);

    const openPseudoDialog = () => {
        setPseudoDraft(profile.pseudo ?? '');
        setPseudoError(null);
        setPseudoOpen(true);
    };

    const submitPseudo = async () => {
        if (!isValidZchecsPseudo(pseudoDraft)) {
            setPseudoError(t('ZCHECS.PSEUDO_INVALID'));

            return;
        }

        const result = await setPseudo(pseudoDraft);

        if (!result.ok) {
            setPseudoError(result.error ?? t('ZCHECS.PSEUDO_INVALID'));

            return;
        }

        setPseudoOpen(false);
        await refresh();
    };

    const isEmpty = invitations.length + myTurn.length + waiting.length + finished.length === 0;

    return (
        <AppWrapper scrollable>
            <AppTitle app={app} isBigHeader />
            <AppContent>
                <button
                    type="button"
                    onClick={() => navigate('/zchecs/stats')}
                    className={clsx('w-full flex items-center justify-between rounded-xl px-4 py-3 mb-3 shadow', {
                        'bg-ios-700 text-white': theme === 'dark',
                        'bg-white text-black': theme === 'light',
                    })}
                >
                    <span className="flex flex-col items-start">
                        <span className="text-2xl font-semibold">{profile.elo}</span>
                        <span className="text-xs text-gray-400">
                            {t('ZCHECS.RECORD', {
                                wins: profile.wins,
                                losses: profile.losses,
                                draws: profile.draws,
                            })}
                        </span>
                    </span>
                    <span className="flex flex-col items-end">
                        <span className="text-sm text-[#347DD9]">
                            {profile.rank === null
                                ? t('ZCHECS.UNRANKED')
                                : t('ZCHECS.RANK', { rank: profile.rank, total: profile.totalRanked })}
                        </span>
                        {profile.rank === null && (
                            <span className="text-[10px] text-gray-500 text-right max-w-[9rem]">
                                {t('ZCHECS.UNRANKED_HINT', { count: ZCHECS_LEADERBOARD_MIN_GAMES })}
                            </span>
                        )}
                    </span>
                </button>

                <button
                    type="button"
                    onClick={openPseudoDialog}
                    className={clsx('w-full flex items-center justify-between rounded-xl px-4 py-2 mb-3 text-sm', {
                        'bg-ios-700 text-white': theme === 'dark',
                        'bg-white text-black shadow': theme === 'light',
                    })}
                >
                    <span className="text-gray-500 text-xs">{t('ZCHECS.PSEUDO')}</span>
                    <span className={clsx('truncate', { 'text-[#347DD9]': !profile.pseudo })}>
                        {profile.pseudo || t('ZCHECS.PSEUDO_UNSET')}
                    </span>
                </button>

                <div className="flex gap-2 mb-3">
                    <button
                        type="button"
                        className="grow rounded-xl bg-[#347DD9] text-white py-2.5 font-medium"
                        onClick={() => navigate('/zchecs/new')}
                    >
                        {t('ZCHECS.NEW_GAME')}
                    </button>
                    <button
                        type="button"
                        className={clsx('grow rounded-xl py-2.5 font-medium', {
                            'bg-ios-700 text-white': theme === 'dark',
                            'bg-white text-black': theme === 'light',
                        })}
                        onClick={() => navigate('/zchecs/leaderboard')}
                    >
                        {t('ZCHECS.LEADERBOARD')}
                    </button>
                </div>

                {profile.inQueue && (
                    <button
                        type="button"
                        className="w-full rounded-xl bg-gray-500/40 py-2 mb-3 text-sm"
                        onClick={async () => {
                            await leaveQueue();
                            await refresh();
                        }}
                    >
                        {t('ZCHECS.QUEUE_RUNNING')}
                    </button>
                )}

                {isEmpty && (
                    <p className="text-center text-sm text-gray-500 mt-10">
                        {t('ZCHECS.EMPTY')}
                        <br />
                        {t('ZCHECS.EMPTY_HINT')}
                    </p>
                )}

                <Section title={t('ZCHECS.SECTION_INVITATIONS')} count={invitations.length}>
                    {invitations.map(game => (
                        <ZchecsGameRow
                            key={game.id}
                            game={game}
                            onAccept={id => acceptGame(id)}
                            onDecline={id => declineGame(id)}
                        />
                    ))}
                </Section>

                <Section title={t('ZCHECS.SECTION_MY_TURN')} count={myTurn.length}>
                    {myTurn.map(game => (
                        <ZchecsGameRow key={game.id} game={game} />
                    ))}
                </Section>

                <Section title={t('ZCHECS.SECTION_WAITING')} count={waiting.length}>
                    {waiting.map(game => (
                        <ZchecsGameRow key={game.id} game={game} />
                    ))}
                </Section>

                <Section title={t('ZCHECS.SECTION_FINISHED')} count={finished.length}>
                    {finished.map(game => (
                        <ZchecsGameRow key={game.id} game={game} />
                    ))}
                </Section>

                <div className="h-24" />
            </AppContent>

            {pseudoOpen && (
                <PseudoDialog
                    value={pseudoDraft}
                    error={pseudoError}
                    onChange={value => {
                        setPseudoError(null);
                        setPseudoDraft(value);
                    }}
                    onClose={() => setPseudoOpen(false)}
                    onSubmit={submitPseudo}
                />
            )}
        </AppWrapper>
    );
};

/** Saisie du pseudo. `useGameFocus` redirige le clavier vers la NUI le temps du dialogue. */
const PseudoDialog: FunctionComponent<{
    value: string;
    error: string | null;
    onChange: (value: string) => void;
    onClose: () => void;
    onSubmit: () => void;
}> = ({ value, error, onChange, onClose, onSubmit }) => {
    const { t } = useTranslation();

    useGameFocus();

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
            <DialogForm
                title={t('ZCHECS.PSEUDO_TITLE')}
                content={t('ZCHECS.PSEUDO_HELP')}
                handleClose={onClose}
                onSubmit={onSubmit}
            >
                <TextField
                    autoFocus
                    value={value}
                    maxLength={ZCHECS_PSEUDO_MAX}
                    placeholder={t('ZCHECS.PSEUDO')}
                    onChange={event => onChange(event.currentTarget.value)}
                />
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
            </DialogForm>
        </div>
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
