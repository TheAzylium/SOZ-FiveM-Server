import { DotsHorizontalIcon } from '@heroicons/react/solid';
import { Chess } from 'chess.js';
import clsx from 'clsx';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import {
    ZCHECS_VARIANT_LABELS,
    ZchecsGame,
    ZchecsMove,
    zchecsIsUrgent,
} from '../../../../../../shared/phone/apps/zchecs';
import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useActionSheet } from '../../../system/action-sheet/hooks/useActionSheet';
import { useSetAlerts } from '../../../system/alerts/alerts.atom';
import { useAppTitleActionsUpdater } from '../../../system/apps/hooks/useAppTitleActionsUpdater';
import { useAppTitleGetBackUpdater } from '../../../system/apps/hooks/useAppTitleGetBackUpdater';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useContact } from '../../../system/sim-card/hooks/useContact';
import { ZchecsBoard } from '../components/ZchecsBoard';
import { ZchecsClock } from '../components/ZchecsClock';
import { ZchecsMaterial } from '../components/ZchecsMaterial';
import { ZchecsMoveList } from '../components/ZchecsMoveList';
import { ZchecsReplayControls } from '../components/ZchecsReplayControls';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsClock } from '../hooks/useZchecsClock';
import { useZchecsGame } from '../zchecs.atom';
import {
    canClaimTimeout,
    didIWin,
    eloDeltaLabel,
    endReasonKey,
    outcomeLabel,
    remainingTime,
    signed,
} from '../zchecs.labels';

export const ZchecsGamePage: FunctionComponent = () => {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useThemeConfig();
    const setAlert = useSetAlerts();
    const { openActionSheet, closeActionSheet } = useActionSheet();

    const gameId = Number(id);
    const game = useZchecsGame(gameId);
    const contact = useContact(game?.opponentNumber);

    const { move, resign, offerDraw, answerDraw, claimTimeout, acceptGame, declineGame, hideGame } = useZchecsAPI();

    // FEN joué localement en attendant la confirmation serveur (retour visuel immédiat).
    const [pendingFen, setPendingFen] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const clock = useZchecsClock(game);

    // Revue de la partie: null = position courante, -1 = position de départ.
    const [reviewPly, setReviewPly] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);

    // Replié quand on vient jouer, déplié quand on vient revoir une partie finie.
    const [movesOpen, setMovesOpen] = useState(false);

    const totalPlies = game?.moves.length ?? 0;
    const isFinished = game?.status === 'FINISHED';

    useEffect(() => {
        setMovesOpen(isFinished);
    }, [isFinished, gameId]);

    /** Rejoue les N premiers demi-coups pour obtenir la position consultée. */
    const review = useMemo(() => {
        if (reviewPly === null || !game) {
            return null;
        }

        const chess = new Chess();

        try {
            game.moves.slice(0, reviewPly + 1).forEach(san => chess.move(san));
        } catch (e) {
            // SAN inattendu: on retombe sur la position courante plutôt que de casser l'écran.
            return null;
        }

        const history = chess.history({ verbose: true });
        const last = history.length > 0 ? history[history.length - 1] : null;
        const lastMove: ZchecsMove | null = last ? { from: last.from, to: last.to, san: last.san } : null;

        return { fen: chess.fen(), lastMove };
    }, [game, reviewPly]);

    const seek = useCallback(
        (ply: number) => {
            setPlaying(false);
            setReviewPly(Math.max(-1, Math.min(totalPlies - 1, ply)));
        },
        [totalPlies]
    );

    const backToLive = useCallback(() => {
        setPlaying(false);
        setReviewPly(null);
    }, []);

    const togglePlay = useCallback(() => {
        if (playing) {
            setPlaying(false);

            return;
        }

        // Relance depuis le début si on est déjà au dernier coup.
        if (reviewPly === null || reviewPly >= totalPlies - 1) {
            setReviewPly(-1);
        }

        setPlaying(true);
    }, [playing, reviewPly, totalPlies]);

    // Lecture automatique: chaque tick programme le suivant, et s'arrête à la fin.
    useEffect(() => {
        if (!playing) {
            return;
        }

        if (reviewPly !== null && reviewPly >= totalPlies - 1) {
            setPlaying(false);

            return;
        }

        const timer = setTimeout(() => setReviewPly(prev => (prev === null ? 0 : prev + 1)), 1000);

        return () => clearTimeout(timer);
    }, [playing, reviewPly, totalPlies]);

    /** Toute action passe par ici: plus de DynamicIsland, les erreurs vont en inline. */
    const run = useCallback(async (action: Promise<{ ok: boolean; error?: string }>) => {
        setError(null);
        const result = await action;

        if (!result.ok) {
            setError(result.error ?? null);
        }

        return result.ok;
    }, []);

    useAppTitleGetBackUpdater(() => navigate('/zchecs'));

    useEffect(() => {
        setPendingFen(null);
    }, [game?.fen]);

    const confirm = useCallback(
        (title: string, content: string, onSubmit: () => void) => {
            setAlert({
                title,
                content,
                onSubmit: () => {
                    setAlert(null);
                    onSubmit();
                },
                onClose: () => setAlert(null),
            });
        },
        [setAlert]
    );

    // Pseudo ZChecs d'abord, puis le repertoire, puis le numero brut.
    const opponentName = game?.opponentName || contact?.display || game?.opponentNumber || '';

    /** Menu « … » de l'en-tête: actions rares, sorties du flux principal. */
    const openMenu = useCallback(() => {
        if (!game) {
            return;
        }

        const options = [];

        if (game.status === 'ACTIVE') {
            if (!game.drawOfferFromMe && !game.drawOfferFromOpponent) {
                options.push({
                    label: t('ZCHECS.OFFER_DRAW'),
                    onClick: () => {
                        closeActionSheet();
                        confirm(t('ZCHECS.OFFER_DRAW'), t('ZCHECS.DRAW_CONFIRM', { name: opponentName }), () =>
                            run(offerDraw(game.id))
                        );
                    },
                });
            }

            if (canClaimTimeout(game)) {
                options.push({
                    label: t('ZCHECS.CLAIM_TIMEOUT'),
                    onClick: () => {
                        closeActionSheet();
                        confirm(t('ZCHECS.CLAIM_TIMEOUT'), t('ZCHECS.CLAIM_CONFIRM', { name: opponentName }), () =>
                            run(claimTimeout(game.id))
                        );
                    },
                });
            }

            options.push({
                label: t('ZCHECS.RESIGN'),
                onClick: () => {
                    closeActionSheet();
                    confirm(
                        t('ZCHECS.RESIGN'),
                        t(game.ranked ? 'ZCHECS.RESIGN_CONFIRM_RANKED' : 'ZCHECS.RESIGN_CONFIRM_CASUAL'),
                        () => run(resign(game.id))
                    );
                },
            });
        }

        if (game.status === 'FINISHED') {
            options.push({
                label: t('ZCHECS.HIDE'),
                onClick: () => {
                    closeActionSheet();
                    confirm(t('ZCHECS.HIDE'), t('ZCHECS.HIDE_CONFIRM'), async () => {
                        await hideGame(game.id);
                        navigate('/zchecs');
                    });
                },
            });
        }

        openActionSheet(t('ZCHECS.ACTIONS'), options);
    }, [game, opponentName, t, confirm, run, offerDraw, claimTimeout, resign, hideGame, navigate, openActionSheet, closeActionSheet]);

    const hasMenu = game?.status === 'ACTIVE' || game?.status === 'FINISHED';

    useAppTitleActionsUpdater(
        useMemo(
            () =>
                hasMenu
                    ? [{ display: true, icon: <DotsHorizontalIcon className="size-6" />, onClick: openMenu }]
                    : [],
            [hasMenu, openMenu]
        )
    );

    const handleMove = useCallback(
        async (from: string, to: string, promotion?: string) => {
            if (!game) {
                return;
            }

            setError(null);

            try {
                const chess = new Chess(game.fen);
                chess.move({ from, to, promotion });
                setPendingFen(chess.fen());
            } catch (e) {
                setError(t('ZCHECS.ILLEGAL_MOVE'));

                return;
            }

            const result = await move({ id: game.id, from, to, promotion });

            if (!result.ok) {
                setPendingFen(null);
                setError(result.error ?? t('ZCHECS.ILLEGAL_MOVE'));
            }
        },
        [game, move, t]
    );

    if (!game) {
        return (
            <AppWrapper>
                <AppTitle title={t('ZCHECS.TITLE')} />
                <AppContent>
                    <p className="text-center text-sm text-gray-500 mt-10">{t('ZCHECS.GAME_NOT_FOUND')}</p>
                </AppContent>
            </AppWrapper>
        );
    }

    // On ne joue que sur la position courante: consulter le passé bloque le plateau.
    const atLive = reviewPly === null || reviewPly === totalPlies - 1;
    const displayedFen = review ? review.fen : pendingFen ?? game.fen;
    const displayedLastMove = review ? review.lastMove : pendingFen ? null : game.lastMove;
    const interactive = game.status === 'ACTIVE' && game.isMyTurn && !pendingFen && atLive;
    const urgent = zchecsIsUrgent(game);

    // Une seule ligne d'info compacte au lieu de trois.
    const infos = [
        game.variant === 'THREE_CHECK' && game.status === 'ACTIVE'
            ? t('ZCHECS.CHECK_COUNT', { mine: game.myChecks, opponent: game.opponentChecks })
            : null,
        game.stake ? t('ZCHECS.STAKE', { win: signed(game.stake.win), loss: signed(game.stake.loss) }) : null,
        game.status === 'ACTIVE' && !game.isMyTurn && game.deadlineAt && !urgent
            ? t('ZCHECS.DEADLINE', { time: remainingTime(game.deadlineAt) })
            : null,
    ].filter(Boolean);

    return (
        <AppWrapper scrollable>
            <AppTitle
                title={opponentName}
                subtitle={[
                    t(game.ranked ? 'ZCHECS.RANKED' : 'ZCHECS.CASUAL'),
                    game.variant !== 'STANDARD' ? ZCHECS_VARIANT_LABELS[game.variant] : null,
                    `${game.opponentElo} ELO`,
                ]
                    .filter(Boolean)
                    .join(' · ')}
            />
            <AppContent>
                <StatusBanner game={game} waiting={Boolean(pendingFen)} />

                {urgent && game.deadlineAt && (
                    <p className="mt-2 rounded-xl bg-red-600/80 text-white text-xs text-center px-3 py-2">
                        {t('ZCHECS.DEADLINE_URGENT', { time: remainingTime(game.deadlineAt), name: opponentName })}
                    </p>
                )}

                <div className="flex items-center justify-between mt-3 px-1 gap-2">
                    <span className="text-xs text-gray-400 truncate">{opponentName}</span>
                    <ZchecsClock timeMs={clock.opponentTimeMs} running={clock.opponentRunning} />
                </div>
                <ZchecsMaterial fen={displayedFen} side={game.myColor === 'w' ? 'b' : 'w'} />

                <div className="flex justify-center my-2">
                    <ZchecsBoard
                        fen={displayedFen}
                        myColor={game.myColor}
                        interactive={interactive}
                        lastMove={displayedLastMove}
                        onMove={handleMove}
                    />
                </div>

                <ZchecsMaterial fen={displayedFen} side={game.myColor} />
                <div className="flex items-center justify-between mb-2 px-1 gap-2">
                    <span className="text-xs text-gray-400">
                        {t(game.myColor === 'w' ? 'ZCHECS.PLAYING_WHITE' : 'ZCHECS.PLAYING_BLACK')}
                    </span>
                    <ZchecsClock timeMs={clock.myTimeMs} running={clock.myRunning} />
                </div>

                {infos.length > 0 && (
                    <p className="text-center text-[11px] text-gray-500 mb-2 truncate">{infos.join(' · ')}</p>
                )}

                {error && <p className="text-center text-sm text-red-400 mb-2">{error}</p>}

                {!atLive && (
                    <button
                        type="button"
                        onClick={backToLive}
                        className="w-full rounded-xl bg-amber-600/80 text-white text-xs px-3 py-2 mb-2"
                    >
                        {t('ZCHECS.REVIEWING', { ply: (reviewPly ?? 0) + 1 })}
                    </button>
                )}

                {/* Réponses à une sollicitation: elles restent hors du menu « … ». */}
                {game.status === 'PENDING' && !game.isCreator && (
                    <div className="flex gap-2 mb-2">
                        <ActionBar label={t('ZCHECS.ACCEPT_CHALLENGE')} primary onClick={() => run(acceptGame(game.id))} />
                        <ActionBar
                            label={t('ZCHECS.DECLINE')}
                            onClick={() =>
                                confirm(t('ZCHECS.DECLINE'), t('ZCHECS.DECLINE_CONFIRM', { name: opponentName }), async () => {
                                    if (await run(declineGame(game.id))) {
                                        navigate('/zchecs');
                                    }
                                })
                            }
                        />
                    </div>
                )}

                {game.status === 'PENDING' && game.isCreator && (
                    <p className="text-center text-sm text-gray-500 mb-2">
                        {t('ZCHECS.WAITING_ANSWER', { name: opponentName })}
                    </p>
                )}

                {game.status === 'ACTIVE' && game.drawOfferFromOpponent && (
                    <div
                        className={clsx('rounded-xl p-3 mb-2', {
                            'bg-ios-700 text-white': theme === 'dark',
                            'bg-white text-black': theme === 'light',
                        })}
                    >
                        <p className="text-sm mb-2">{t('ZCHECS.DRAW_OFFER_RECEIVED', { name: opponentName })}</p>
                        <div className="flex gap-2">
                            <ActionBar label={t('ZCHECS.ACCEPT')} primary onClick={() => run(answerDraw(game.id, true))} />
                            <ActionBar label={t('ZCHECS.DECLINE')} onClick={() => run(answerDraw(game.id, false))} />
                        </div>
                    </div>
                )}

                {game.status === 'ACTIVE' && game.drawOfferFromMe && (
                    <p className="text-center text-xs text-gray-500 mb-2">{t('ZCHECS.DRAW_OFFER_SENT')}</p>
                )}

                {totalPlies > 0 && (
                    <>
                        <button
                            type="button"
                            onClick={() => setMovesOpen(open => !open)}
                            className={clsx('w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm', {
                                'bg-ios-700 text-white': theme === 'dark',
                                'bg-white text-black shadow': theme === 'light',
                            })}
                        >
                            <span>{t('ZCHECS.MOVES_COUNT', { count: totalPlies })}</span>
                            <span className="text-gray-500">{movesOpen ? '▾' : '▸'}</span>
                        </button>

                        {movesOpen && (
                            <div className="mt-2">
                                <ZchecsReplayControls
                                    ply={reviewPly ?? totalPlies - 1}
                                    total={totalPlies}
                                    playing={playing}
                                    onSeek={seek}
                                    onTogglePlay={togglePlay}
                                />
                                <ZchecsMoveList
                                    moves={game.moves}
                                    selectedPly={reviewPly ?? totalPlies - 1}
                                    onSelectPly={seek}
                                />
                            </div>
                        )}
                    </>
                )}

                <div className="h-8" />
            </AppContent>
        </AppWrapper>
    );
};

const StatusBanner: FunctionComponent<{ game: ZchecsGame; waiting: boolean }> = ({ game, waiting }) => {
    const { t } = useTranslation();
    const theme = useThemeConfig();

    const text = useMemo(() => {
        if (game.status === 'PENDING') {
            return t(game.isCreator ? 'ZCHECS.INVITE_SENT' : 'ZCHECS.CHALLENGED');
        }

        if (game.status === 'ACTIVE') {
            if (waiting) {
                return t('ZCHECS.SENDING_MOVE');
            }

            let label = t(game.isMyTurn ? 'ZCHECS.MY_TURN' : 'ZCHECS.OPPONENT_TURN');

            try {
                if (new Chess(game.fen).inCheck()) {
                    label += ` · ${t('ZCHECS.IN_CHECK')}`;
                }
            } catch (e) {
                // FEN invalide: on garde le libellé simple.
            }

            return label;
        }

        if (game.result === null) {
            return t('ZCHECS.END_DECLINED');
        }

        const reason = game.endReason ? ` · ${t(endReasonKey(game.endReason))}` : '';
        const delta = eloDeltaLabel(game.myEloDelta);

        return `${outcomeLabel(t, game, true)}${reason}${delta ? ` · ${delta}` : ''}`;
    }, [game, waiting, t]);

    const won = game.status === 'FINISHED' && game.result !== null && game.result !== 'DRAW' && didIWin(game);

    return (
        <div
            className={clsx('rounded-xl px-4 py-2 text-center text-sm font-medium', {
                'bg-ios-700 text-white': theme === 'dark',
                'bg-white text-black': theme === 'light',
                'text-[#347DD9]': game.status === 'ACTIVE' && game.isMyTurn && !waiting,
                'text-green-400': won,
            })}
        >
            {text}
        </div>
    );
};

const ActionBar: FunctionComponent<{
    label: string;
    primary?: boolean;
    onClick: () => void;
}> = ({ label, primary, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx('grow rounded-xl py-2 text-sm font-medium', {
                'bg-[#347DD9] text-white': primary,
                'bg-gray-500/40': !primary,
            })}
        >
            {label}
        </button>
    );
};
