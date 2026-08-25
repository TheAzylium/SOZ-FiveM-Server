import { useEffect, useState } from 'react';

import { hasClock, ZchecsGame } from '../../../../../../shared/phone/apps/zchecs';

interface ZchecsClockState {
    myTimeMs: number | null;
    opponentTimeMs: number | null;
    /** true quand MA pendule décompte en ce moment. */
    myRunning: boolean;
    opponentRunning: boolean;
}

const IDLE: ZchecsClockState = { myTimeMs: null, opponentTimeMs: null, myRunning: false, opponentRunning: false };

/**
 * Affichage de la pendule. Le temps s'écoule en continu côté serveur — téléphone
 * fermé, joueur déconnecté — ce hook ne fait donc que refléter l'état : il ne
 * pilote rien et n'envoie rien.
 *
 * Le serveur reste seul juge : c'est son tick qui met fin à la partie sur chute
 * du drapeau. Ici on se contente d'interpoler entre deux mises à jour du DTO.
 */
export const useZchecsClock = (game: ZchecsGame | undefined): ZchecsClockState => {
    // Valeurs serveur + instant de réception, pour interpoler sans dériver.
    const [seed, setSeed] = useState<{ mine: number | null; opponent: number | null; at: number }>({
        mine: null,
        opponent: null,
        at: Date.now(),
    });

    // Force le recalcul de l'affichage, sans stocker de compte à rebours.
    const [, setNow] = useState(Date.now());

    const running = Boolean(game) && game.status === 'ACTIVE' && hasClock(game.timeControl) && game.clockRunning;

    useEffect(() => {
        if (!game) {
            return;
        }

        setSeed({ mine: game.myTimeMs, opponent: game.opponentTimeMs, at: Date.now() });
    }, [game?.id, game?.fen, game?.myTimeMs, game?.opponentTimeMs]);

    useEffect(() => {
        if (!running) {
            return;
        }

        const timer = setInterval(() => setNow(Date.now()), 250);

        return () => clearInterval(timer);
    }, [running]);

    if (!game || !hasClock(game.timeControl)) {
        return IDLE;
    }

    // Seul le camp au trait consomme du temps.
    const elapsed = running ? Date.now() - seed.at : 0;
    const mine = seed.mine === null ? null : Math.max(0, seed.mine - (game.isMyTurn ? elapsed : 0));
    const opponent = seed.opponent === null ? null : Math.max(0, seed.opponent - (game.isMyTurn ? 0 : elapsed));

    return {
        myTimeMs: mine,
        opponentTimeMs: opponent,
        myRunning: running && game.isMyTurn,
        opponentRunning: running && !game.isMyTurn,
    };
};
