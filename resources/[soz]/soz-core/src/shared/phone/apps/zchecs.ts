export type ZchecsColor = 'w' | 'b';
export type ZchecsStatus = 'PENDING' | 'ACTIVE' | 'FINISHED';
export type ZchecsResult = 'WHITE' | 'BLACK' | 'DRAW';

export type ZchecsEndReason =
    | 'CHECKMATE'
    | 'STALEMATE'
    | 'RESIGN'
    | 'TIMEOUT'
    | 'DECLINED'
    | 'DRAW_AGREED'
    | 'DRAW_MATERIAL'
    | 'DRAW_REPETITION'
    | 'DRAW_50_MOVES';

export type ZchecsNotifyReason = 'INVITE' | 'MATCHED' | 'MOVE' | 'DRAW_OFFER' | 'END';

export interface ZchecsGame {
    id: number;
    ranked: boolean;
    status: ZchecsStatus;
    fen: string;
    myColor: ZchecsColor;
    isMyTurn: boolean;
    isCreator: boolean;
    opponentNumber: string;
    opponentName: string | null;
    opponentElo: number;
    result: ZchecsResult | null;
    endReason: ZchecsEndReason | null;
    myEloDelta: number | null;
    drawOfferFromOpponent: boolean;
    drawOfferFromMe: boolean;
    lastMoveAt: number;
    createdAt: number;
}

export interface ZchecsProfile {
    elo: number;
    wins: number;
    losses: number;
    draws: number;
    inQueue: boolean;
}

export interface ZchecsMovePayload {
    id: number;
    from: string;
    to: string;
    promotion?: string;
}

export interface ZchecsUpdatePayload {
    game: ZchecsGame;
    reason: ZchecsNotifyReason | null;
}

export const ZCHECS_ELO_START = 1000;
export const ZCHECS_ELO_K = 32;
export const ZCHECS_TIMEOUT_MS = 3 * 24 * 3600 * 1000;
export const ZCHECS_MAX_ACTIVE_GAMES = 10;

export const ZCHECS_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Elo standard: E = 1 / (1 + 10^((eloAdversaire - eloJoueur) / 400)), delta = K * (score - E).
 * score vaut 1 pour une victoire, 0.5 pour une nulle, 0 pour une defaite.
 */
export const computeEloDelta = (myElo: number, opponentElo: number, score: 0 | 0.5 | 1): number => {
    const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));

    return Math.round(ZCHECS_ELO_K * (score - expected));
};

export const isZchecsGameOpen = (game: ZchecsGame): boolean => game.status !== 'FINISHED';

export const zchecsGameNeedsMe = (game: ZchecsGame): boolean =>
    (game.status === 'ACTIVE' && game.isMyTurn) || (game.status === 'PENDING' && !game.isCreator);
