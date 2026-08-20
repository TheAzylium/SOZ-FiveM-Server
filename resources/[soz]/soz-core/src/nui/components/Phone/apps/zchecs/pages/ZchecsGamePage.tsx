import { Chess } from 'chess.js';
import clsx from 'clsx';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ZchecsGame } from '../../../../../../shared/phone/apps/zchecs';
import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useSetAlerts } from '../../../system/alerts/alerts.atom';
import { useAppTitleGetBackUpdater } from '../../../system/apps/hooks/useAppTitleGetBackUpdater';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useContact } from '../../../system/sim-card/hooks/useContact';
import { ZchecsBoard } from '../components/ZchecsBoard';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsGame } from '../zchecs.atom';
import { canClaimTimeout, didIWin, END_REASON_LABELS, eloDeltaLabel } from '../zchecs.labels';

export const ZchecsGamePage: FunctionComponent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useThemeConfig();
    const setAlert = useSetAlerts();

    const gameId = Number(id);
    const game = useZchecsGame(gameId);
    const contact = useContact(game?.opponentNumber);

    const { move, resign, offerDraw, answerDraw, claimTimeout, acceptGame, declineGame } = useZchecsAPI();

    // FEN joué localement en attendant la confirmation serveur (retour visuel immédiat).
    const [pendingFen, setPendingFen] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                setError('Coup illégal');

                return;
            }

            const result = await move({ id: game.id, from, to, promotion });

            if (!result.ok) {
                setPendingFen(null);
                setError(result.error ?? 'Coup refusé');
            }
        },
        [game, move]
    );

    if (!game) {
        return (
            <AppWrapper>
                <AppTitle title="ZChecs" />
                <AppContent>
                    <p className="text-center text-sm text-gray-500 mt-10">Partie introuvable.</p>
                </AppContent>
            </AppWrapper>
        );
    }

    const opponent = contact?.display || game.opponentName || game.opponentNumber;
    const displayedFen = pendingFen ?? game.fen;
    const interactive = game.status === 'ACTIVE' && game.isMyTurn && !pendingFen;

    return (
        <AppWrapper scrollable>
            <AppTitle title={opponent} subtitle={`${game.ranked ? 'Classée' : 'Amicale'} · ${game.opponentElo} ELO`} />
            <AppContent>
                <StatusBanner game={game} waiting={Boolean(pendingFen)} />

                <div className="flex justify-center my-3">
                    <ZchecsBoard
                        fen={displayedFen}
                        myColor={game.myColor}
                        interactive={interactive}
                        onMove={handleMove}
                    />
                </div>

                <p className="text-center text-xs text-gray-500 mb-3">
                    Tu joues les {game.myColor === 'w' ? 'blancs' : 'noirs'}
                </p>

                {error && <p className="text-center text-sm text-red-400 mb-3">{error}</p>}

                {game.status === 'PENDING' && !game.isCreator && (
                    <div className="flex gap-2">
                        <ActionBar
                            label="Accepter le défi"
                            primary
                            onClick={async () => {
                                await acceptGame(game.id);
                            }}
                        />
                        <ActionBar
                            label="Refuser"
                            onClick={() =>
                                confirm('Refuser le défi', `Refuser la partie contre ${opponent} ?`, async () => {
                                    await declineGame(game.id);
                                    navigate('/zchecs');
                                })
                            }
                        />
                    </div>
                )}

                {game.status === 'PENDING' && game.isCreator && (
                    <p className="text-center text-sm text-gray-500">
                        En attente de la réponse de {opponent}.
                    </p>
                )}

                {game.status === 'ACTIVE' && game.drawOfferFromOpponent && (
                    <div
                        className={clsx('rounded-xl p-3 mb-3', {
                            'bg-ios-700 text-white': theme === 'dark',
                            'bg-white text-black': theme === 'light',
                        })}
                    >
                        <p className="text-sm mb-2">{opponent} propose la nulle.</p>
                        <div className="flex gap-2">
                            <ActionBar label="Accepter" primary onClick={() => answerDraw(game.id, true)} />
                            <ActionBar label="Refuser" onClick={() => answerDraw(game.id, false)} />
                        </div>
                    </div>
                )}

                {game.status === 'ACTIVE' && (
                    <div className="flex flex-col gap-2">
                        {!game.drawOfferFromMe && !game.drawOfferFromOpponent && (
                            <ActionBar
                                label="Proposer la nulle"
                                onClick={() =>
                                    confirm('Proposer la nulle', `Proposer la nulle à ${opponent} ?`, () =>
                                        offerDraw(game.id)
                                    )
                                }
                            />
                        )}

                        {game.drawOfferFromMe && (
                            <p className="text-center text-xs text-gray-500">Proposition de nulle envoyée.</p>
                        )}

                        {canClaimTimeout(game) && (
                            <ActionBar
                                label="Réclamer la victoire (inactivité)"
                                primary
                                onClick={() =>
                                    confirm(
                                        'Réclamer la victoire',
                                        `${opponent} n'a pas joué depuis plus de 3 jours. Réclamer la victoire ?`,
                                        () => claimTimeout(game.id)
                                    )
                                }
                            />
                        )}

                        <ActionBar
                            label="Abandonner"
                            danger
                            onClick={() =>
                                confirm(
                                    'Abandonner',
                                    game.ranked
                                        ? 'Tu perds la partie et des points ELO. Confirmer ?'
                                        : 'Tu perds la partie. Confirmer ?',
                                    () => resign(game.id)
                                )
                            }
                        />
                    </div>
                )}

                <div className="h-24" />
            </AppContent>
        </AppWrapper>
    );
};

const StatusBanner: FunctionComponent<{ game: ZchecsGame; waiting: boolean }> = ({ game, waiting }) => {
    const theme = useThemeConfig();

    const text = useMemo(() => {
        if (game.status === 'PENDING') {
            return game.isCreator ? 'Invitation envoyée' : 'Tu es défié';
        }

        if (game.status === 'ACTIVE') {
            if (waiting) {
                return 'Envoi du coup…';
            }

            let label = game.isMyTurn ? 'À toi de jouer' : "Au tour de l'adversaire";

            try {
                if (new Chess(game.fen).inCheck()) {
                    label += ' · Échec !';
                }
            } catch (e) {
                // FEN invalide: on garde le libellé simple.
            }

            return label;
        }

        if (game.result === null) {
            return END_REASON_LABELS.DECLINED;
        }

        const outcome = game.result === 'DRAW' ? 'Partie nulle' : didIWin(game) ? 'Victoire' : 'Défaite';
        const reason = game.endReason ? ` · ${END_REASON_LABELS[game.endReason]}` : '';
        const delta = eloDeltaLabel(game.myEloDelta);

        return `${outcome}${reason}${delta ? ` · ${delta}` : ''}`;
    }, [game, waiting]);

    return (
        <div
            className={clsx('rounded-xl px-4 py-2.5 text-center text-sm font-medium', {
                'bg-ios-700 text-white': theme === 'dark',
                'bg-white text-black': theme === 'light',
                'text-[#347DD9]': game.status === 'ACTIVE' && game.isMyTurn && !waiting,
            })}
        >
            {text}
        </div>
    );
};

const ActionBar: FunctionComponent<{
    label: string;
    primary?: boolean;
    danger?: boolean;
    onClick: () => void;
}> = ({ label, primary, danger, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx('grow rounded-xl py-2 text-sm font-medium', {
                'bg-[#347DD9] text-white': primary,
                'bg-red-600/80 text-white': danger,
                'bg-gray-500/40': !primary && !danger,
            })}
        >
            {label}
        </button>
    );
};
