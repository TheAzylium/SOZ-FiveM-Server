import { On, OnEvent } from '@core/decorators/event';
import { Provider } from '@core/decorators/provider';
import { wait } from '@public/core/utils';
import { ServerEvent } from '@public/shared/event';

@Provider()
export class ObjectAttachedProvider {
    private objects = new Map<number, Map<number, number>>();

    @OnEvent(ServerEvent.OBJECT_ATTACHED_REGISTER)
    public async onObjectAttachedRegister(source: number, netId: number) {
        let playerObjects = this.objects.get(source);
        if (!playerObjects) {
            playerObjects = new Map<number, number>();
            this.objects.set(source, playerObjects);
        }

        if (GetPlayerRoutingBucket(source.toString()) != 0) {
            return;
        }

        let entity = 0;
        for (let i = 0; i < 10; i++) {
            entity = NetworkGetEntityFromNetworkId(netId);
            if (entity != 0) {
                break;
            }
            await wait(100);
        }

        playerObjects.set(netId, GetEntityModel(entity));
    }

    @OnEvent(ServerEvent.OBJECT_ATTACHED_UNREGISTER)
    public async onObjectAttachedUnregister(source: number, netId: number) {
        const playerObjects = this.objects.get(source);
        if (!playerObjects) {
            return;
        }

        playerObjects.delete(netId);
    }

    @On('playerDropped')
    public onDropped(source: number) {
        const playerObjects = this.objects.get(source);
        if (!playerObjects) {
            return;
        }

        for (const netId of playerObjects.keys()) {
            const entityId = NetworkGetEntityFromNetworkId(netId);
            if (entityId) {
                if (playerObjects.get(netId) == GetEntityModel(entityId) && GetEntityType(entityId) == 3) {
                    DeleteEntity(entityId);
                }
            }
        }
        this.objects.delete(source);
    }
}
