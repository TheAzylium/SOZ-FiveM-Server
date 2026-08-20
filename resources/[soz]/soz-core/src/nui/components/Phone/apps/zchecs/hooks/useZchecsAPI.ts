import { useCallback } from 'react';

import { NuiEvent } from '../../../../../../shared/event/nui';
import { ZchecsGame, ZchecsMovePayload } from '../../../../../../shared/phone/apps/zchecs';
import { isErr, Result } from '../../../../../../shared/result';
import { fetchNui } from '../../../../../fetch';
import { useDynamicIsland } from '../../../system/dynamic-island/hooks/useDynamicIsland';

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

export const useZchecsAPI = () => {
    const { sendIsland } = useDynamicIsland();

    const call = useCallback(
        async <I>(event: NuiEvent, input?: I): Promise<MutationResult> => {
            try {
                const raw = await fetchNui<I, Result<ZchecsGame, string>>(event, input);
                const { ok, error, value } = unwrap(raw);

                sendIsland(ok ? 'success' : 'error');

                return { ok, error, game: value };
            } catch (e) {
                sendIsland('error');

                return { ok: false, error: 'Erreur de communication' };
            }
        },
        [sendIsland]
    );

    const refresh = useCallback(() => fetchNui(NuiEvent.PhoneAppZchecsRefresh), []);
    const fetchLeaderboard = useCallback(() => fetchNui(NuiEvent.PhoneAppZchecsGetLeaderboard), []);

    const createGame = useCallback((number: string) => call(NuiEvent.PhoneAppZchecsCreate, number), [call]);

    const joinQueue = useCallback(async (): Promise<MutationResult> => {
        try {
            const raw = await fetchNui<never, Result<ZchecsGame | null, string>>(NuiEvent.PhoneAppZchecsQueueJoin);
            const { ok, error, value } = unwrap(raw);

            sendIsland(ok ? 'success' : 'error');

            return { ok, error, game: value ?? undefined };
        } catch (e) {
            sendIsland('error');

            return { ok: false, error: 'Erreur de communication' };
        }
    }, [sendIsland]);

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
