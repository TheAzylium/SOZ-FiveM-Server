import { ApiConfig } from '@public/shared/api';
import { NuiEvent } from '@public/shared/event';

import { Once, OnceStep, OnNuiEvent } from '../../core/decorators/event';
import { Exportable } from '../../core/decorators/exports';
import { Provider } from '../../core/decorators/provider';
import { emitRpc } from '../../core/rpc';
import { RpcServerEvent } from '../../shared/rpc';

@Provider()
export class PlayerTokenProvider {
    private token: string;

    @Once(OnceStep.PlayerLoaded, true)
    public async loadJwtToken() {
        this.token = await emitRpc<string>(RpcServerEvent.PLAYER_GET_JWT_TOKEN);
    }

    @Exportable('GetJwtToken')
    public getJwtToken(): string {
        return this.token;
    }

    @OnNuiEvent(NuiEvent.GetJWTToken)
    public async onGetJwtToken(): Promise<string> {
        return this.token;
    }

    @OnNuiEvent(NuiEvent.GetAPIConfig)
    public async onGetApiConfig(): Promise<ApiConfig> {
        return {
            apiEndpoint: `${GetConvar('soz_public_api_endpoint', 'https://api.soz.zerator.com')}/graphql`,
            publicEndpoint: GetConvar('soz_public_endpoint', 'https://soz.zerator.com'),
        };
    }
}
