import { Inject } from '@public/core/decorators/injectable';
import { Provider } from '@public/core/decorators/provider';
import { LeaderboardInterface } from '@public/shared/phone/apps/game';

import { Once, OnceStep, OnEvent, OnNuiEvent } from '../../../core/decorators/event';
import { emitRpc } from '../../../core/rpc';
import { ClientEvent } from '../../../shared/event/client';
import { NuiEvent } from '../../../shared/event/nui';
import {
    ZchecsEloPoint,
    ZchecsGame,
    ZchecsMovePayload,
    ZchecsNewGameOptions,
    ZchecsProfile,
    ZchecsUpdatePayload,
} from '../../../shared/phone/apps/zchecs';
import { Result } from '../../../shared/result';
import { RpcServerEvent } from '../../../shared/rpc';
import { NuiDispatch } from '../../nui/nui.dispatch';

@Provider()
export class PhoneAppZchecsProvider {
    @Inject(NuiDispatch)
    private readonly nuiDispatch: NuiDispatch;

    @Once(OnceStep.NuiLoaded)
    @OnEvent(ClientEvent.ADMIN_SWITCH_CHARACTER)
    async onNuiLoaded() {
        await this.refresh();
    }

    @OnEvent(ClientEvent.PHONE_APP_ZCHECS_UPDATE)
    onZchecsUpdate(payload: ZchecsUpdatePayload) {
        this.nuiDispatch.dispatch('phone', 'AppZchecsUpdateGame', payload);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsRefresh)
    async onRefresh() {
        await this.refresh();
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsCreate)
    async onCreate(options: ZchecsNewGameOptions): Promise<Result<ZchecsGame, string>> {
        const result = await emitRpc<Result<ZchecsGame, string>>(RpcServerEvent.PHONE_APP_ZCHECS_CREATE, options);
        await this.refresh();

        return result;
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsQueueJoin)
    async onQueueJoin(): Promise<Result<ZchecsGame | null, string>> {
        const result = await emitRpc<Result<ZchecsGame | null, string>>(RpcServerEvent.PHONE_APP_ZCHECS_QUEUE_JOIN);
        await this.refresh();

        return result;
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsQueueLeave)
    async onQueueLeave() {
        await emitRpc(RpcServerEvent.PHONE_APP_ZCHECS_QUEUE_LEAVE);
        await this.refreshProfile();
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsAccept)
    async onAccept(id: number): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_ACCEPT, id);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsDecline)
    async onDecline(id: number): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_DECLINE, id);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsResign)
    async onResign(id: number): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_RESIGN, id);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsOfferDraw)
    async onOfferDraw(id: number): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_OFFER_DRAW, id);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsClaimTimeout)
    async onClaimTimeout(id: number): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_CLAIM_TIMEOUT, id);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsAnswerDraw)
    async onAnswerDraw({ id, accept }: { id: number; accept: boolean }): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_ANSWER_DRAW, id, accept);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsMove)
    async onMove(payload: ZchecsMovePayload): Promise<Result<ZchecsGame, string>> {
        return this.mutate(RpcServerEvent.PHONE_APP_ZCHECS_MOVE, payload);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsGetLeaderboard)
    async onGetLeaderboard() {
        const leaderboard = await emitRpc<LeaderboardInterface[]>(RpcServerEvent.PHONE_APP_ZCHECS_GET_LEADERBOARD);
        this.nuiDispatch.dispatch('phone', 'AppZchecsSetLeaderboard', leaderboard || []);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsGetHistory)
    async onGetHistory() {
        const history = await emitRpc<ZchecsEloPoint[]>(RpcServerEvent.PHONE_APP_ZCHECS_GET_HISTORY);
        this.nuiDispatch.dispatch('phone', 'AppZchecsSetHistory', history || []);
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsSetPseudo)
    async onSetPseudo(pseudo: string): Promise<Result<string, string>> {
        const result = await emitRpc<Result<string, string>>(RpcServerEvent.PHONE_APP_ZCHECS_SET_PSEUDO, pseudo);
        // Le pseudo apparait sur toutes les parties: on recharge tout.
        await this.refresh();

        return result;
    }

    @OnNuiEvent(NuiEvent.PhoneAppZchecsHide)
    async onHide(id: number) {
        await emitRpc(RpcServerEvent.PHONE_APP_ZCHECS_HIDE, id);
        await this.refresh();
    }

    private async mutate(event: RpcServerEvent, ...args: any[]): Promise<Result<ZchecsGame, string>> {
        const result = await emitRpc<Result<ZchecsGame, string>>(event, ...args);
        await this.refresh();

        return result;
    }

    private async refresh() {
        const games = await emitRpc<ZchecsGame[]>(RpcServerEvent.PHONE_APP_ZCHECS_GET_GAMES);
        this.nuiDispatch.dispatch('phone', 'AppZchecsSetGames', games || []);

        await this.refreshProfile();
    }

    private async refreshProfile() {
        const profile = await emitRpc<ZchecsProfile>(RpcServerEvent.PHONE_APP_ZCHECS_GET_PROFILE);

        if (profile) {
            this.nuiDispatch.dispatch('phone', 'AppZchecsSetProfile', profile);
        }
    }
}
