import { useCallback } from 'react';

import { NuiEvent } from '../../../../../../shared/event/nui';
import { ZchecsGame, ZchecsMovePayload, ZchecsNewGameOptions } from '../../../../../../shared/phone/apps/zchecs';
import { isErr, Result } from '../../../../../../shared/result';
import { fetchNui } from '../../../../../fetch';

type MutationResult = { ok: boolean; error?: string; game?: ZchecsGame };

/**
 * En dehors du jeu (dev navigateur), fetchNui renvoie null: on considere l'action
 * comme un succes silencieux pour ne pas bloquer l'iteration sur l'UI.
 */
const unwrap = <T>(result: Result<T, string> | null): { ok: boolean; error?: string; value?: T } => {
    if (!result) {
        return { ok: true };
    }

    if (isErr(result)) {
        return { ok: false, error: result.err };
    }

    return { ok: true, value: result.ok };
};

/**
 * Aucune de ces actions ne declenche la DynamicIsland de validation: sur un jeu,
 * le retour visuel c'est le plateau qui bouge, le son et le bandeau d'etat.
 * Les erreurs sont remontees a l'appelant, qui les affiche en inline.
 */
export const useZchecsAPI = () => {
    const call = useCallback(async <I>(event: NuiEvent, input?: I): Promise<MutationResult> => {
        try {
            const raw = await fetchNui<I, Result<ZchecsGame, string>>(event, input);
            const { ok, error, value } = unwrap(raw);

            return { ok, error, game: value };
        } catch (e) {
            return { ok: false, error: 'Erreur de communication' };
        }
    }, []);

    const refresh = useCallback(() => fetchNui(NuiEvent.PhoneAppZchecsRefresh), []);
    const fetchLeaderboard = useCallback(() => fetchNui(NuiEvent.PhoneAppZchecsGetLeaderboard), []);
    const fetchHistory = useCallback(() => fetchNui(NuiEvent.PhoneAppZchecsGetHistory), []);

    const hideGame = useCallback(async (id: number) => {
        await fetchNui(NuiEvent.PhoneAppZchecsHide, id);
    }, []);

    const setPseudo = useCallback(async (pseudo: string): Promise<{ ok: boolean; error?: string }> => {
        try {
            const raw = await fetchNui<string, Result<string, string>>(NuiEvent.PhoneAppZchecsSetPseudo, pseudo);

            if (!raw) {
                return { ok: true };
            }

            return isErr(raw) ? { ok: false, error: raw.err } : { ok: true };
        } catch (e) {
            return { ok: false, error: 'Erreur de communication' };
        }
    }, []);

    const createGame = useCallback(
        (options: ZchecsNewGameOptions) => call(NuiEvent.PhoneAppZchecsCreate, options),
        [call]
    );

    const joinQueue = useCallback(async (): Promise<MutationResult> => {
        try {
            const raw = await fetchNui<never, Result<ZchecsGame | null, string>>(NuiEvent.PhoneAppZchecsQueueJoin);
            const { ok, error, value } = unwrap(raw);

            return { ok, error, game: value ?? undefined };
        } catch (e) {
            return { ok: false, error: 'Erreur de communication' };
        }
    }, []);

    const leaveQueue = useCallback(async () => {
        await fetchNui(NuiEvent.PhoneAppZchecsQueueLeave);
    }, []);

    const acceptGame = useCallback((id: number) => call(NuiEvent.PhoneAppZchecsAccept, id), [call]);
    const declineGame = useCallback((id: number) => call(NuiEvent.PhoneAppZchecsDecline, id), [call]);
    const resign = useCallback((id: number) => call(NuiEvent.PhoneAppZchecsResign, id), [call]);
    const offerDraw = useCallback((id: number) => call(NuiEvent.PhoneAppZchecsOfferDraw, id), [call]);
    const claimTimeout = useCallback((id: number) => call(NuiEvent.PhoneAppZchecsClaimTimeout, id), [call]);

    const answerDraw = useCallback(
        (id: number, accept: boolean) => call(NuiEvent.PhoneAppZchecsAnswerDraw, { id, accept }),
        [call]
    );

    const move = useCallback((payload: ZchecsMovePayload) => call(NuiEvent.PhoneAppZchecsMove, payload), [call]);

    return {
        refresh,
        fetchLeaderboard,
        fetchHistory,
        hideGame,
        setPseudo,
        createGame,
        joinQueue,
        leaveQueue,
        acceptGame,
        declineGame,
        resign,
        offerDraw,
        answerDraw,
        claimTimeout,
        move,
    };
};
