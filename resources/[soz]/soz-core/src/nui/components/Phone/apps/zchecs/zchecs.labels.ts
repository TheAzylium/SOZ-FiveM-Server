import { ZCHECS_TIMEOUT_MS, ZchecsEndReason, ZchecsGame } from '../../../../../shared/phone/apps/zchecs';

export const END_REASON_LABELS: Record<ZchecsEndReason, string> = {
    CHECKMATE: 'Échec et mat',
    STALEMATE: 'Pat',
    RESIGN: 'Abandon',
    TIMEOUT: 'Temps écoulé',
    DECLINED: 'Défi refusé',
    DRAW_AGREED: 'Nulle acceptée',
    DRAW_MATERIAL: 'Matériel insuffisant',
    DRAW_REPETITION: 'Triple répétition',
    DRAW_50_MOVES: 'Règle des 50 coups',
};

export const opponentLabel = (game: ZchecsGame): string => game.opponentName || game.opponentNumber;

export const didIWin = (game: ZchecsGame): boolean =>
    (game.result === 'WHITE' && game.myColor === 'w') || (game.result === 'BLACK' && game.myColor === 'b');

/** Libellé court affiché sous le nom de l'adversaire dans la liste. */
export const gameStatusLabel = (game: ZchecsGame): string => {
    if (game.status === 'PENDING') {
        return game.isCreator ? 'Invitation envoyée' : 'Te défie';
    }

    if (game.status === 'ACTIVE') {
        if (game.drawOfferFromOpponent) {
            return 'Propose la nulle';
        }

        return game.isMyTurn ? 'À toi de jouer' : "Au tour de l'adversaire";
    }

    if (game.result === null) {
        return END_REASON_LABELS.DECLINED;
    }

    const outcome = game.result === 'DRAW' ? 'Nulle' : didIWin(game) ? 'Victoire' : 'Défaite';
    const reason = game.endReason ? END_REASON_LABELS[game.endReason] : '';

    return reason ? `${outcome} · ${reason}` : outcome;
};

export const eloDeltaLabel = (delta: number | null): string | null => {
    if (delta === null || delta === undefined) {
        return null;
    }

    return `${delta > 0 ? '+' : ''}${delta} ELO`;
};

/** La victoire par forfait n'est réclamable que si l'adversaire dépasse le délai. */
export const canClaimTimeout = (game: ZchecsGame): boolean =>
    game.status === 'ACTIVE' && !game.isMyTurn && Date.now() - game.lastMoveAt >= ZCHECS_TIMEOUT_MS;

export const relativeTime = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60_000);

    if (minutes < 1) {
        return "à l'instant";
    }

    if (minutes < 60) {
        return `il y a ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `il y a ${hours} h`;
    }

    const days = Math.floor(hours / 24);

    return `il y a ${days} j`;
};
