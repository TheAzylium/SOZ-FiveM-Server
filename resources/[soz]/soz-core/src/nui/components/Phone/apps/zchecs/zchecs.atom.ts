import { LeaderboardInterface } from '@public/shared/phone/apps/game';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import {
    ZCHECS_ELO_START,
    ZCHECS_START_FEN,
    ZchecsEloPoint,
    ZchecsGame,
    ZchecsNotifyReason,
    ZchecsProfile,
    ZchecsUpdatePayload,
    zchecsGameNeedsMe,
} from '../../../../../shared/phone/apps/zchecs';
import { useNuiEvent } from '../../../../hook/nui';
import { useInjectDebugData } from '../../system/debug/hooks/useInjectDebugData';
import { useNotifications } from '../../system/notifications/hooks/useNotifications';
import { didIWin, eloDeltaLabel } from './zchecs.labels';
import { useZchecsSound, ZchecsSoundKind } from './zchecs.sounds';

const gamesAtom = atom<ZchecsGame[]>([]);
const leaderboardAtom = atom<LeaderboardInterface[]>([]);
const historyAtom = atom<ZchecsEloPoint[]>([]);
const profileAtom = atom<ZchecsProfile>({
    pseudo: null,
    elo: ZCHECS_ELO_START,
    wins: 0,
    losses: 0,
    draws: 0,
    inQueue: false,
    rank: null,
    totalRanked: 0,
});

/** Les invitations reçues, en premier : ce sont les seules qui demandent une réponse. */
const invitationsAtom = atom(get => get(gamesAtom).filter(game => game.status === 'PENDING' && !game.isCreator));
const myTurnGamesAtom = atom(get => get(gamesAtom).filter(game => game.status === 'ACTIVE' && game.isMyTurn));
const waitingGamesAtom = atom(get =>
    get(gamesAtom).filter(
        game => (game.status === 'ACTIVE' && !game.isMyTurn) || (game.status === 'PENDING' && game.isCreator)
    )
);
const finishedGamesAtom = atom(get => get(gamesAtom).filter(game => game.status === 'FINISHED'));

/** Badge de l'accueil du téléphone : tout ce qui attend une action de ma part. */
const badgeAtom = atom(get => get(gamesAtom).filter(zchecsGameNeedsMe).length);

export const useZchecsGames = () => useAtomValue(gamesAtom);
export const useZchecsInvitations = () => useAtomValue(invitationsAtom);
export const useZchecsMyTurnGames = () => useAtomValue(myTurnGamesAtom);
export const useZchecsWaitingGames = () => useAtomValue(waitingGamesAtom);
export const useZchecsFinishedGames = () => useAtomValue(finishedGamesAtom);
export const useZchecsLeaderboard = () => useAtomValue(leaderboardAtom);
export const useZchecsHistory = () => useAtomValue(historyAtom);
export const useZchecsProfile = () => useAtomValue(profileAtom);
export const useZchecsBadgeCount = () => useAtomValue(badgeAtom);

export const useZchecsGame = (id: number): ZchecsGame | undefined =>
    useAtomValue(gamesAtom).find(game => game.id === id);

/** Chaque type d'événement a son propre son custom (voir public/assets/zchecs/). */
const SOUND_BY_REASON: Record<Exclude<ZchecsNotifyReason, 'END'>, ZchecsSoundKind> = {
    INVITE: 'invite',
    MATCHED: 'matched',
    MOVE: 'move',
    DRAW_OFFER: 'draw-offer',
    REMINDER: 'reminder',
};

/** La fin de partie sonne différemment selon l'issue. */
const endSoundKind = (game: ZchecsGame): ZchecsSoundKind => {
    if (game.result === null || game.result === 'DRAW') {
        return 'draw';
    }

    return didIWin(game) ? 'win' : 'loss';
};

export const useAppZchecsStateHandlers = () => {
    const { t } = useTranslation();

    const setGames = useSetAtom(gamesAtom);
    const setLeaderboard = useSetAtom(leaderboardAtom);
    const setHistory = useSetAtom(historyAtom);
    const setProfile = useSetAtom(profileAtom);

    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { addNotification } = useNotifications();

    const playSound = useZchecsSound();

    useNuiEvent('phone', 'AppZchecsSetGames', setGames);
    useNuiEvent('phone', 'AppZchecsSetLeaderboard', setLeaderboard);
    useNuiEvent('phone', 'AppZchecsSetHistory', setHistory);
    useNuiEvent('phone', 'AppZchecsSetProfile', setProfile);

    useNuiEvent('phone', 'AppZchecsUpdateGame', ({ game, reason }: ZchecsUpdatePayload) => {
        setGames(prev => {
            const exists = prev.some(current => current.id === game.id);

            return exists ? prev.map(current => (current.id === game.id ? game : current)) : [game, ...prev];
        });

        if (!reason) {
            return;
        }

        const name = game.opponentName || game.opponentNumber;
        const content = notificationContent(t, game, reason, name);

        if (!content) {
            return;
        }

        playSound(reason === 'END' ? endSoundKind(game) : SOUND_BY_REASON[reason]);

        // Inutile d'afficher une banniere pour la partie qu'on est deja en train de
        // regarder: le plateau se met a jour sous les yeux du joueur.
        if (pathname === `/zchecs/game/${game.id}`) {
            return;
        }

        addNotification(
            {
                app: 'zchecs',
                group: `zchecs-${game.id}`,
                title: t('ZCHECS.TITLE'),
                content,
                keepWhenPhoneClosed: true,
                onClick: () => navigate(`/zchecs/game/${game.id}`),
            },
            null
        );
    }, [pathname]);

    useInjectDebugData(() => {
        setProfile({ pseudo: 'Kasparoz', elo: 1042, wins: 6, losses: 4, draws: 1, inQueue: false, rank: 4, totalRanked: 17 });

        setLeaderboard([
            { citizenid: 'A', avatar: null, player_name: 'RoiDuBluff', score: 1420, game_played: 32 },
            { citizenid: 'B', avatar: null, player_name: 'MatEnDeux', score: 1310, game_played: 21 },
            { citizenid: 'C', avatar: null, player_name: 'TourDeForce', score: 1180, game_played: 14 },
            { citizenid: 'D', avatar: null, player_name: 'PionSolitaire', score: 1042, game_played: 11 },
            { citizenid: 'E', avatar: null, player_name: 'CavalierFou', score: 980, game_played: 8 },
        ]);

        setHistory(
            [1000, 1016, 998, 1022, 1040, 1018, 1051, 1033, 1018, 1042].map((elo, index, all) => ({
                at: Date.now() - (all.length - index) * 86_400_000,
                elo,
                delta: index === 0 ? 0 : elo - all[index - 1],
                opponentName: ['MatEnDeux', 'TourDeForce', 'CavalierFou'][index % 3],
                result: index % 3 === 1 ? 'BLACK' : 'WHITE',
            }))
        );

        const day = 24 * 3600 * 1000;

        // Valeurs par defaut des champs de mode, surchargees au cas par cas.
        const mockDefaults = {
            variant: 'STANDARD',
            timeControl: 'CORRESPONDENCE',
            myTimeMs: null,
            opponentTimeMs: null,
            clockRunning: false,
            myChecks: 0,
            opponentChecks: 0,
        } as const;

        setGames([
            {
                id: 1,
                ...mockDefaults,
                ranked: false,
                status: 'PENDING',
                fen: ZCHECS_START_FEN,
                myColor: 'b',
                isMyTurn: false,
                isCreator: false,
                opponentNumber: '555-1234',
                opponentName: 'RoiDuBluff',
                opponentElo: 1420,
                result: null,
                endReason: null,
                myEloDelta: null,
                myEloAfter: null,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                moves: [],
                lastMove: null,
                deadlineAt: null,
                lastMoveAt: Date.now() - 60_000,
                createdAt: Date.now() - 60_000,
                stake: null,
            },
            {
                id: 2,
                ...mockDefaults,
                variant: 'THREE_CHECK',
                myChecks: 1,
                opponentChecks: 2,
                ranked: true,
                status: 'ACTIVE',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
                myColor: 'b',
                isMyTurn: true,
                isCreator: false,
                opponentNumber: '555-4321',
                opponentName: 'MatEnDeux',
                opponentElo: 1310,
                result: null,
                endReason: null,
                myEloDelta: null,
                myEloAfter: null,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                moves: ['e4', 'e5', 'Nf3'],
                lastMove: { from: 'g1', to: 'f3', san: 'Nf3' },
                deadlineAt: Date.now() + 2 * day,
                lastMoveAt: Date.now() - day,
                createdAt: Date.now() - 2 * day,
                stake: { win: 25, loss: -7, draw: 9 },
            },
            {
                id: 6,
                ...mockDefaults,
                timeControl: 'BLITZ',
                myTimeMs: 128_000,
                opponentTimeMs: 244_000,
                clockRunning: true,
                ranked: true,
                status: 'ACTIVE',
                fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
                myColor: 'w',
                isMyTurn: true,
                isCreator: true,
                opponentNumber: '555-7777',
                opponentName: 'PionSolitaire',
                opponentElo: 1042,
                result: null,
                endReason: null,
                myEloDelta: null,
                myEloAfter: null,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'],
                lastMove: { from: 'g8', to: 'f6', san: 'Nf6' },
                // Deadline dans 5 h: doit déclencher l'avertissement d'urgence.
                deadlineAt: Date.now() + 5 * 3600 * 1000,
                lastMoveAt: Date.now() - (3 * day - 5 * 3600 * 1000),
                createdAt: Date.now() - 4 * day,
                stake: { win: 16, loss: -16, draw: 0 },
            },
            {
                id: 3,
                ...mockDefaults,
                ranked: true,
                status: 'ACTIVE',
                fen: 'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 2 2',
                myColor: 'w',
                isMyTurn: false,
                isCreator: true,
                opponentNumber: '555-9876',
                opponentName: null,
                opponentElo: 980,
                result: null,
                endReason: null,
                myEloDelta: null,
                myEloAfter: null,
                drawOfferFromOpponent: true,
                drawOfferFromMe: false,
                moves: ['d4', 'Nf6'],
                lastMove: { from: 'g8', to: 'f6', san: 'Nf6' },
                deadlineAt: Date.now() - day,
                lastMoveAt: Date.now() - 4 * day,
                createdAt: Date.now() - 5 * day,
                stake: { win: 12, loss: -20, draw: -4 },
            },
            {
                id: 4,
                ...mockDefaults,
                ranked: true,
                status: 'FINISHED',
                fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
                myColor: 'b',
                isMyTurn: false,
                isCreator: true,
                opponentNumber: '555-1111',
                opponentName: 'TourDeForce',
                opponentElo: 1180,
                result: 'BLACK',
                endReason: 'CHECKMATE',
                myEloDelta: 24,
                myEloAfter: 1042,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                moves: ['f3', 'e5', 'g4', 'Qh4#'],
                lastMove: { from: 'd8', to: 'h4', san: 'Qh4#' },
                deadlineAt: null,
                lastMoveAt: Date.now() - 2 * day,
                createdAt: Date.now() - 2 * day,
                stake: null,
            },
            {
                // Partie riche en prises, roque, echec et desambiguisation:
                // sert a verifier l'affichage du materiel et la notation francaise.
                id: 7,
                ...mockDefaults,
                ranked: false,
                status: 'FINISHED',
                fen: 'r1bq1b1r/ppp3pp/4k3/3np3/1nB5/2N2Q2/PPPP1PPP/R1B2RK1 b - - 5 9',
                myColor: 'w',
                isMyTurn: false,
                isCreator: true,
                opponentNumber: '555-0077',
                opponentName: 'GambitGaspard',
                opponentElo: 1100,
                result: 'WHITE',
                endReason: 'RESIGN',
                myEloDelta: null,
                myEloAfter: null,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                moves: [
                    'e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5',
                    'Nxd5', 'Nxf7', 'Kxf7', 'Qf3+', 'Ke6', 'Nc3', 'Nb4', 'O-O',
                ],
                lastMove: { from: 'e1', to: 'g1', san: 'O-O' },
                deadlineAt: null,
                lastMoveAt: Date.now() - 3 * day,
                createdAt: Date.now() - 3 * day,
                stake: null,
            },
            {
                id: 5,
                ...mockDefaults,
                ranked: true,
                status: 'FINISHED',
                fen: ZCHECS_START_FEN,
                myColor: 'w',
                isMyTurn: false,
                isCreator: false,
                opponentNumber: '555-2222',
                opponentName: 'CavalierFou',
                opponentElo: 1420,
                result: 'BLACK',
                endReason: 'RESIGN',
                myEloDelta: -9,
                myEloAfter: 1018,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                moves: [],
                lastMove: null,
                deadlineAt: null,
                lastMoveAt: Date.now() - 6 * day,
                createdAt: Date.now() - 6 * day,
                stake: null,
            },
        ]);
    });
};

const notificationContent = (
    t: (key: string, options?: Record<string, unknown>) => string,
    game: ZchecsGame,
    reason: ZchecsNotifyReason,
    name: string
): string | null => {
    switch (reason) {
        case 'INVITE':
            return t('ZCHECS.NOTIF_INVITE', { name });
        case 'MATCHED':
            return t('ZCHECS.NOTIF_MATCHED', { name });
        case 'MOVE':
            return game.isMyTurn ? t('ZCHECS.NOTIF_MOVE', { name }) : null;
        case 'DRAW_OFFER':
            return t('ZCHECS.NOTIF_DRAW_OFFER', { name });
        case 'REMINDER':
            return t('ZCHECS.NOTIF_REMINDER', { name });
        case 'END': {
            const delta = eloDeltaLabel(game.myEloDelta);
            const suffix = delta ? ` (${delta})` : '';

            if (game.result === null) {
                return t('ZCHECS.NOTIF_DECLINED', { name });
            }

            if (game.result === 'DRAW') {
                return t('ZCHECS.NOTIF_DRAW', { name, suffix });
            }

            return t(didIWin(game) ? 'ZCHECS.NOTIF_WIN' : 'ZCHECS.NOTIF_LOSS', { name, suffix });
        }
        default:
            return null;
    }
};
