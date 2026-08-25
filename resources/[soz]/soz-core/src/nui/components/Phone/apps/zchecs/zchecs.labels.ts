import { TFunction } from 'i18next';

import { ZchecsEndReason, ZchecsGame } from '../../../../../shared/phone/apps/zchecs';

export const endReasonKey = (reason: ZchecsEndReason): string => `ZCHECS.END_${reason}`;

export const opponentLabel = (game: ZchecsGame): string => game.opponentName || game.opponentNumber;

/**
 * chess.js produit du SAN anglais (N = Knight). On l'aligne sur les lettres du
 * plateau, qui sont en francais.
 *
 * ATTENTION: c'est un formatage d'AFFICHAGE uniquement. `game.moves` doit rester
 * en anglais en memoire, c'est ce que `chess.move(san)` sait rejouer.
 */
const SAN_PIECES: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' };

export const frenchSan = (san: string): string =>
    san.replace(/^[KQRBN]/, match => SAN_PIECES[match]).replace(/=([KQRBN])/, (_, piece) => `=${SAN_PIECES[piece]}`);

export const didIWin = (game: ZchecsGame): boolean =>
    (game.result === 'WHITE' && game.myColor === 'w') || (game.result === 'BLACK' && game.myColor === 'b');

export const outcomeLabel = (t: TFunction, game: ZchecsGame, long = false): string => {
    if (game.result === 'DRAW') {
        return t(long ? 'ZCHECS.OUTCOME_DRAW_LONG' : 'ZCHECS.OUTCOME_DRAW');
    }

    return t(didIWin(game) ? 'ZCHECS.OUTCOME_WIN' : 'ZCHECS.OUTCOME_LOSS');
};

/** Libellé court affiché sous le nom de l'adversaire dans la liste. */
export const gameStatusLabel = (t: TFunction, game: ZchecsGame): string => {
    if (game.status === 'PENDING') {
        return t(game.isCreator ? 'ZCHECS.INVITE_SENT' : 'ZCHECS.CHALLENGES_YOU');
    }

    if (game.status === 'ACTIVE') {
        if (game.drawOfferFromOpponent) {
            return t('ZCHECS.PROPOSES_DRAW');
        }

        return t(game.isMyTurn ? 'ZCHECS.MY_TURN' : 'ZCHECS.OPPONENT_TURN');
    }

    if (game.result === null) {
        return t('ZCHECS.END_DECLINED');
    }

    const reason = game.endReason ? t(endReasonKey(game.endReason)) : '';

    return reason ? `${outcomeLabel(t, game)} · ${reason}` : outcomeLabel(t, game);
};

export const eloDeltaLabel = (delta: number | null): string | null => {
    if (delta === null || delta === undefined) {
        return null;
    }

    return `${delta > 0 ? '+' : ''}${delta} ELO`;
};

export const signed = (value: number): string => `${value > 0 ? '+' : ''}${value}`;

/** La victoire par forfait n'est réclamable que si le délai de l'adversaire est dépassé. */
export const canClaimTimeout = (game: ZchecsGame): boolean =>
    game.status === 'ACTIVE' && !game.isMyTurn && game.deadlineAt !== null && Date.now() >= game.deadlineAt;

export const relativeTime = (timestamp: number): string => {
    const minutes = Math.floor((Date.now() - timestamp) / 60_000);

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

    return `il y a ${Math.floor(hours / 24)} j`;
};

/** Durée restante formatée, pour le compte à rebours avant forfait. */
export const remainingTime = (deadline: number): string => {
    const minutes = Math.max(0, Math.floor((deadline - Date.now()) / 60_000));

    if (minutes < 60) {
        return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} h`;
    }

    const days = Math.floor(hours / 24);

    return `${days} j ${hours % 24} h`;
};
