import { LeaderboardInterface } from '@public/shared/phone/apps/game';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useNavigate } from 'react-router-dom';

import {
    ZCHECS_ELO_START,
    ZCHECS_START_FEN,
    ZchecsGame,
    ZchecsNotifyReason,
    ZchecsProfile,
    ZchecsUpdatePayload,
    zchecsGameNeedsMe,
} from '../../../../../shared/phone/apps/zchecs';
import { useNuiEvent } from '../../../../hook/nui';
import { useInjectDebugData } from '../../system/debug/hooks/useInjectDebugData';
import { useNotifications } from '../../system/notifications/hooks/useNotifications';
import { useRingtoneSound } from '../../system/sound/hooks/useRingtoneSound';

const gamesAtom = atom<ZchecsGame[]>([]);
const leaderboardAtom = atom<LeaderboardInterface[]>([]);
const profileAtom = atom<ZchecsProfile>({
    elo: ZCHECS_ELO_START,
    wins: 0,
    losses: 0,
    draws: 0,
    inQueue: false,
});

/** Les invitations recues, en premier: ce sont les seules qui demandent une reponse. */
const invitationsAtom = atom(get =>
    get(gamesAtom).filter(game => game.status === 'PENDING' && !game.isCreator)
);
const myTurnGamesAtom = atom(get => get(gamesAtom).filter(game => game.status === 'ACTIVE' && game.isMyTurn));
const waitingGamesAtom = atom(get =>
    get(gamesAtom).filter(
        game => (game.status === 'ACTIVE' && !game.isMyTurn) || (game.status === 'PENDING' && game.isCreator)
    )
);
const finishedGamesAtom = atom(get => get(gamesAtom).filter(game => game.status === 'FINISHED'));

/** Badge de l'accueil du telephone: tout ce qui attend une action de ma part. */
const badgeAtom = atom(get => get(gamesAtom).filter(zchecsGameNeedsMe).length);

export const useZchecsGames = () => useAtomValue(gamesAtom);
export const useZchecsInvitations = () => useAtomValue(invitationsAtom);
export const useZchecsMyTurnGames = () => useAtomValue(myTurnGamesAtom);
export const useZchecsWaitingGames = () => useAtomValue(waitingGamesAtom);
export const useZchecsFinishedGames = () => useAtomValue(finishedGamesAtom);
export const useZchecsLeaderboard = () => useAtomValue(leaderboardAtom);
export const useZchecsProfile = () => useAtomValue(profileAtom);
export const useZchecsBadgeCount = () => useAtomValue(badgeAtom);

export const useSetZchecsGames = () => useSetAtom(gamesAtom);

export const useZchecsGame = (id: number): ZchecsGame | undefined =>
    useAtomValue(gamesAtom).find(game => game.id === id);

const notificationText = (game: ZchecsGame, reason: ZchecsNotifyReason): { title: string; content: string } | null => {
    const opponent = game.opponentName || game.opponentNumber;

    switch (reason) {
        case 'INVITE':
            return { title: 'ZChecs', content: `${opponent} te defie !` };
        case 'MATCHED':
            return { title: 'ZChecs', content: `Partie classee lancee contre ${opponent}` };
        case 'MOVE':
            return game.isMyTurn ? { title: 'ZChecs', content: `${opponent} a joue, a toi !` } : null;
        case 'DRAW_OFFER':
            return { title: 'ZChecs', content: `${opponent} propose la nulle` };
        case 'END': {
            const delta = game.myEloDelta;
            const suffix = delta === null || delta === undefined ? '' : ` (${delta > 0 ? '+' : ''}${delta} ELO)`;

            if (game.result === 'DRAW') {
                return { title: 'ZChecs', content: `Nulle contre ${opponent}${suffix}` };
            }

            if (game.result === null) {
                return { title: 'ZChecs', content: `${opponent} a refuse ton defi` };
            }

            const iWon = (game.result === 'WHITE' && game.myColor === 'w') || (game.result === 'BLACK' && game.myColor === 'b');

            return {
                title: 'ZChecs',
                content: `${iWon ? 'Victoire' : 'Defaite'} contre ${opponent}${suffix}`,
            };
        }
        default:
            return null;
    }
};

export const useAppZchecsStateHandlers = () => {
    const setGames = useSetAtom(gamesAtom);
    const setLeaderboard = useSetAtom(leaderboardAtom);
    const setProfile = useSetAtom(profileAtom);

    const navigate = useNavigate();
    const notificationSound = useRingtoneSound('notiSound', false);
    const { addNotification } = useNotifications();

    useNuiEvent('phone', 'AppZchecsSetGames', setGames);
    useNuiEvent('phone', 'AppZchecsSetLeaderboard', setLeaderboard);
    useNuiEvent('phone', 'AppZchecsSetProfile', setProfile);

    useNuiEvent('phone', 'AppZchecsUpdateGame', ({ game, reason }: ZchecsUpdatePayload) => {
        setGames(prev => {
            const exists = prev.some(current => current.id === game.id);

            return exists ? prev.map(current => (current.id === game.id ? game : current)) : [game, ...prev];
        });

        if (!reason) {
            return;
        }

        const text = notificationText(game, reason);

        if (!text) {
            return;
        }

        notificationSound.play();
        addNotification(
            {
                app: 'zchecs',
                group: `zchecs-${game.id}`,
                title: text.title,
                content: text.content,
                onClick: () => navigate(`/zchecs/game/${game.id}`),
            },
            null
        );
    });

    useInjectDebugData(() => {
        setProfile({ elo: 1042, wins: 6, losses: 4, draws: 1, inQueue: false });

        setLeaderboard([
            { citizenid: 'A', avatar: null, player_name: 'Jean Bonbeurre', score: 1420, game_played: 32 },
            { citizenid: 'B', avatar: null, player_name: 'Marie Curie', score: 1310, game_played: 21 },
            { citizenid: 'C', avatar: null, player_name: 'Paul Ochon', score: 1180, game_played: 14 },
            { citizenid: 'D', avatar: null, player_name: 'Sarah Croche', score: 1042, game_played: 11 },
            { citizenid: 'E', avatar: null, player_name: 'Alain Terieur', score: 980, game_played: 8 },
        ]);

        setGames([
            {
                id: 1,
                ranked: false,
                status: 'PENDING',
                fen: ZCHECS_START_FEN,
                myColor: 'b',
                isMyTurn: false,
                isCreator: false,
                opponentNumber: '555-1234',
                opponentName: 'Jean Bonbeurre',
                opponentElo: 1420,
                result: null,
                endReason: null,
                myEloDelta: null,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                lastMoveAt: Date.now() - 60_000,
                createdAt: Date.now() - 60_000,
            },
            {
                id: 2,
                ranked: true,
                status: 'ACTIVE',
                fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
                myColor: 'b',
                isMyTurn: true,
                isCreator: false,
                opponentNumber: '555-4321',
                opponentName: 'Marie Curie',
                opponentElo: 1310,
                result: null,
                endReason: null,
                myEloDelta: null,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                lastMoveAt: Date.now() - 3_600_000,
                createdAt: Date.now() - 7_200_000,
            },
            {
                id: 3,
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
                drawOfferFromOpponent: true,
                drawOfferFromMe: false,
                lastMoveAt: Date.now() - 4 * 24 * 3600 * 1000,
                createdAt: Date.now() - 5 * 24 * 3600 * 1000,
            },
            {
                id: 4,
                ranked: true,
                status: 'FINISHED',
                fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
                myColor: 'b',
                isMyTurn: false,
                isCreator: true,
                opponentNumber: '555-1111',
                opponentName: 'Paul Ochon',
                opponentElo: 1180,
                result: 'BLACK',
                endReason: 'CHECKMATE',
                myEloDelta: 24,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                lastMoveAt: Date.now() - 2 * 24 * 3600 * 1000,
                createdAt: Date.now() - 2 * 24 * 3600 * 1000,
            },
            {
                id: 5,
                ranked: true,
                status: 'FINISHED',
                fen: ZCHECS_START_FEN,
                myColor: 'w',
                isMyTurn: false,
                isCreator: false,
                opponentNumber: '555-2222',
                opponentName: 'Alain Terieur',
                opponentElo: 1420,
                result: 'BLACK',
                endReason: 'RESIGN',
                myEloDelta: -9,
                drawOfferFromOpponent: false,
                drawOfferFromMe: false,
                lastMoveAt: Date.now() - 6 * 24 * 3600 * 1000,
                createdAt: Date.now() - 6 * 24 * 3600 * 1000,
            },
        ]);
    });
};
