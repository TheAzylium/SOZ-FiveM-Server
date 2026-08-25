export type ZchecsColor = 'w' | 'b';
export type ZchecsStatus = 'PENDING' | 'ACTIVE' | 'FINISHED';
export type ZchecsResult = 'WHITE' | 'BLACK' | 'DRAW';

export type ZchecsEndReason =
    | 'CHECKMATE'
    | 'STALEMATE'
    | 'RESIGN'
    | 'TIMEOUT'
    | 'FLAG'
    | 'DECLINED'
    | 'DRAW_AGREED'
    | 'DRAW_MATERIAL'
    | 'DRAW_REPETITION'
    | 'DRAW_50_MOVES'
    | 'KING_OF_THE_HILL'
    | 'THREE_CHECK';

export type ZchecsNotifyReason = 'INVITE' | 'MATCHED' | 'MOVE' | 'DRAW_OFFER' | 'END' | 'REMINDER';

/** Variantes greffees par-dessus chess.js, sans toucher a la generation de coups. */
export type ZchecsVariant = 'STANDARD' | 'KING_OF_THE_HILL' | 'THREE_CHECK';

export type ZchecsTimeControl = 'CORRESPONDENCE' | 'BLITZ' | 'RAPID' | 'CLASSIC';

export interface ZchecsMove {
    from: string;
    to: string;
    san: string;
}

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
    myEloAfter: number | null;
    drawOfferFromOpponent: boolean;
    drawOfferFromMe: boolean;
    /** Notation SAN de tous les coups joues, pour l'historique affiche sous le plateau. */
    moves: string[];
    /** Dernier coup joue, pour le surligner a l'ouverture de la partie. */
    lastMove: ZchecsMove | null;
    /** Date a partir de laquelle l'adversaire peut reclamer la victoire pour inactivite. */
    deadlineAt: number | null;
    lastMoveAt: number;
    createdAt: number;
    /** Gains/pertes d'ELO en jeu si la partie se termine maintenant (parties classees). */
    stake: { win: number; loss: number; draw: number } | null;

    // Modes de jeu (parties amicales)
    variant: ZchecsVariant;
    timeControl: ZchecsTimeControl;
    /** Temps restant en ms, null quand la partie est en correspondance. */
    myTimeMs: number | null;
    opponentTimeMs: number | null;
    /** true quand la pendule du joueur au trait tourne reellement en ce moment. */
    clockRunning: boolean;
    myChecks: number;
    opponentChecks: number;
}

export interface ZchecsNewGameOptions {
    number: string;
    timeControl: ZchecsTimeControl;
    variant: ZchecsVariant;
}

export interface ZchecsProfile {
    /** Pseudo choisi par le joueur. null tant qu'il n'en a pas defini. */
    pseudo: string | null;
    elo: number;
    wins: number;
    losses: number;
    draws: number;
    inQueue: boolean;
    /** Rang au classement, meme hors du top affiche. null si aucune partie classee. */
    rank: number | null;
    totalRanked: number;
}

export interface ZchecsEloPoint {
    at: number;
    elo: number;
    delta: number;
    opponentName: string;
    result: ZchecsResult;
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

/** K eleve pendant le calibrage pour converger vite, puis K standard. */
export const ZCHECS_ELO_K = 32;
export const ZCHECS_ELO_K_CALIBRATION = 40;
export const ZCHECS_CALIBRATION_GAMES = 20;

export const ZCHECS_TIMEOUT_MS = 3 * 24 * 3600 * 1000;
/** Fenetre d'alerte avant que l'adversaire puisse reclamer la victoire. */
export const ZCHECS_REMINDER_MS = 24 * 3600 * 1000;
export const ZCHECS_DRAW_OFFER_TTL_MS = 24 * 3600 * 1000;
export const ZCHECS_QUEUE_TTL_MS = 7 * 24 * 3600 * 1000;

export const ZCHECS_MAX_ACTIVE_GAMES = 20;
export const ZCHECS_LEADERBOARD_MIN_GAMES = 3;
export const ZCHECS_FINISHED_HISTORY = 20;

/** Anti-farm: au-dela de N parties classees contre le meme joueur en 24 h, les gains fondent. */
export const ZCHECS_FARM_WINDOW_MS = 24 * 3600 * 1000;
export const ZCHECS_FARM_THRESHOLD = 3;
export const ZCHECS_FARM_FACTOR = 0.25;

export const ZCHECS_PSEUDO_MIN = 3;
export const ZCHECS_PSEUDO_MAX = 20;

/**
 * Identite affichee dans ZChecs. Le nom du personnage n'est JAMAIS utilise:
 * connaitre le nom de quelqu'un a partir de son numero serait du meta.
 */
export const sanitizeZchecsPseudo = (value: string): string => (value || '').trim().replace(/\s+/g, ' ');

export const isValidZchecsPseudo = (value: string): boolean => {
    const pseudo = sanitizeZchecsPseudo(value);

    return (
        pseudo.length >= ZCHECS_PSEUDO_MIN &&
        pseudo.length <= ZCHECS_PSEUDO_MAX &&
        /^[\p{L}\p{N} _.'-]+$/u.test(pseudo)
    );
};

export const ZCHECS_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/* ------------------------------------------------------------------ *
 *  Modes de jeu
 * ------------------------------------------------------------------ */

export interface ZchecsTimeControlConfig {
    label: string;
    /** null = aucune pendule (jeu par correspondance). */
    initialMs: number | null;
    incrementMs: number;
}

export const ZCHECS_TIME_CONTROLS: Record<ZchecsTimeControl, ZchecsTimeControlConfig> = {
    CORRESPONDENCE: { label: 'Correspondance', initialMs: null, incrementMs: 0 },
    BLITZ: { label: 'Blitz 5+3', initialMs: 5 * 60_000, incrementMs: 3_000 },
    RAPID: { label: 'Rapide 10+5', initialMs: 10 * 60_000, incrementMs: 5_000 },
    CLASSIC: { label: 'Longue 30 min', initialMs: 30 * 60_000, incrementMs: 0 },
};

export const ZCHECS_VARIANT_LABELS: Record<ZchecsVariant, string> = {
    STANDARD: 'Classique',
    KING_OF_THE_HILL: 'Roi de la colline',
    THREE_CHECK: 'Triple echec',
};

/** Cases centrales a atteindre avec son roi en « roi de la colline ». */
export const ZCHECS_HILL_SQUARES = ['d4', 'e4', 'd5', 'e5'];

export const ZCHECS_THREE_CHECK_TARGET = 3;

export const hasClock = (timeControl: ZchecsTimeControl): boolean =>
    ZCHECS_TIME_CONTROLS[timeControl]?.initialMs !== null;

/** mm:ss, ou h:mm:ss au-dela d'une heure. */
export const formatClock = (ms: number | null): string => {
    if (ms === null || ms === undefined) {
        return '--:--';
    }

    const total = Math.max(0, Math.ceil(ms / 1000));
    const seconds = total % 60;
    const minutes = Math.floor(total / 60) % 60;
    const hours = Math.floor(total / 3600);

    const pad = (value: number) => String(value).padStart(2, '0');

    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

export const eloKFactor = (gamesPlayed: number): number =>
    gamesPlayed < ZCHECS_CALIBRATION_GAMES ? ZCHECS_ELO_K_CALIBRATION : ZCHECS_ELO_K;

/**
 * Elo standard: E = 1 / (1 + 10^((eloAdversaire - eloJoueur) / 400)), delta = K * (score - E).
 * score vaut 1 pour une victoire, 0.5 pour une nulle, 0 pour une defaite.
 */
export const computeEloDelta = (
    myElo: number,
    opponentElo: number,
    score: 0 | 0.5 | 1,
    gamesPlayed = ZCHECS_CALIBRATION_GAMES,
    factor = 1
): number => {
    const expected = 1 / (1 + Math.pow(10, (opponentElo - myElo) / 400));

    return Math.round(eloKFactor(gamesPlayed) * factor * (score - expected));
};

export const zchecsGameNeedsMe = (game: ZchecsGame): boolean =>
    (game.status === 'ACTIVE' && game.isMyTurn) || (game.status === 'PENDING' && !game.isCreator);

/** true quand je risque de perdre par forfait dans moins de 24 h. */
export const zchecsIsUrgent = (game: ZchecsGame): boolean =>
    game.status === 'ACTIVE' &&
    game.isMyTurn &&
    game.deadlineAt !== null &&
    game.deadlineAt - Date.now() <= ZCHECS_REMINDER_MS;

const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const INITIAL_COUNTS: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

export interface ZchecsMaterial {
    /** Pieces prises a l'adversaire, triees par valeur decroissante. */
    capturedByWhite: string[];
    capturedByBlack: string[];
    /** Avantage materiel des blancs (negatif si les noirs menent). */
    balance: number;
}

/** Deduit les pieces prises en comparant la position a la position de depart. */
export const computeMaterial = (fen: string): ZchecsMaterial => {
    const placement = fen.split(' ')[0] || '';
    const white: Record<string, number> = {};
    const black: Record<string, number> = {};

    for (const char of placement) {
        if (!/[a-zA-Z]/.test(char)) {
            continue;
        }

        const type = char.toLowerCase();
        const bucket = char === char.toUpperCase() ? white : black;
        bucket[type] = (bucket[type] || 0) + 1;
    }

    const capturedByWhite: string[] = [];
    const capturedByBlack: string[] = [];
    let balance = 0;

    for (const type of Object.keys(INITIAL_COUNTS)) {
        const missingWhite = INITIAL_COUNTS[type] - (white[type] || 0);
        const missingBlack = INITIAL_COUNTS[type] - (black[type] || 0);

        // Une piece blanche manquante a ete prise par les noirs.
        for (let i = 0; i < Math.max(0, missingWhite); i++) {
            capturedByBlack.push(type);
        }

        for (let i = 0; i < Math.max(0, missingBlack); i++) {
            capturedByWhite.push(type);
        }

        balance += PIECE_VALUES[type] * (missingBlack - missingWhite);
    }

    const byValue = (a: string, b: string) => PIECE_VALUES[b] - PIECE_VALUES[a];

    return {
        capturedByWhite: capturedByWhite.sort(byValue),
        capturedByBlack: capturedByBlack.sort(byValue),
        balance,
    };
};
