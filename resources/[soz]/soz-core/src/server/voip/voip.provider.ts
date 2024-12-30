import axios from 'axios';

import { OnEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Rpc } from '../../core/decorators/rpc';
import { Logger } from '../../core/logger';
import { ClientEvent, ServerEvent } from '../../shared/event';
import { RpcServerEvent } from '../../shared/rpc';

@Provider()
export class VoipProvider {
    private playersWithMegaphone = new Set<number>();

    @Inject(Logger)
    private logger: Logger;

    @Rpc(RpcServerEvent.VOIP_IS_MUTED)
    public async isMuted(source: number, playerId: number): Promise<boolean> {
        const httpEndpoint = GetConvar('soz_voip_mumble_http_endpoint', 'http://127.0.0.1:8080');
        const username = GetConvar('soz_voip_mumble_http_username', 'admin');
        const password = GetConvar('soz_voip_mumble_http_password', 'changeme');
        const mumbleUserId = `[${playerId}]%20${GetPlayerName(playerId)}`;

        const response = await axios.get(`${httpEndpoint}/mute/${mumbleUserId}`, {
            auth: {
                username,
                password,
            },
            headers: {
                Accept: 'application/json',
            },
            validateStatus: () => true,
        });

        if (response.status !== 200) {
            return false;
        }

        return response.data.mute;
    }

    @Rpc(RpcServerEvent.VOIP_SET_MUTE)
    public async mute(source: number, playerId: number, value: boolean): Promise<boolean> {
        const httpEndpoint = GetConvar('soz_voip_mumble_http_endpoint', 'http://127.0.0.1:8080');
        const username = GetConvar('soz_voip_mumble_http_username', 'admin');
        const password = GetConvar('soz_voip_mumble_http_password', 'changeme');
        const mumbleUserId = `[${playerId}] ${GetPlayerName(playerId)}`;

        try {
            const response = await axios.post(
                `${httpEndpoint}/mute`,
                {
                    mute: value,
                    user: mumbleUserId,
                },
                {
                    auth: {
                        username,
                        password,
                    },
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    validateStatus: () => true,
                }
            );

            return response.status === 200;
        } catch (e) {
            this.logger.error(e);

            return false;
        }
    }

    @Rpc(RpcServerEvent.VOIP_GET_MEGAPHONE_PLAYERS)
    public getMegaphonePlayers(): number[] {
        return [...this.playersWithMegaphone];
    }

    @OnEvent(ServerEvent.VOIP_SET_MEGAPHONE)
    public setMegaphone(source: number, value: boolean) {
        if (value) {
            this.playersWithMegaphone.add(source);
        } else {
            this.playersWithMegaphone.delete(source);
        }

        TriggerClientEvent(ClientEvent.VOIP_SET_MEGAPHONE, -1, source, value);
    }
}
