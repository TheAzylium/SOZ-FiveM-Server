import { Inject, Injectable } from '@core/decorators/injectable';
import { ServerEvent } from '@public/shared/event/server';
import { Vector3 } from '@public/shared/polyzone/vector';

import { ResourceLoader } from '../repository/resource.loader';

export type AttachedObject = {
    model: string;
    bone: number;
    position: Vector3;
    rotation: Vector3;
    rotationOrder?: number;
    entity?: number;
    ped?: number;
    weaponHash?: number;
    tint?: number;
    weaponComponents?: number[];
    skipNetworking?: boolean;
};

@Injectable()
export class AttachedObjectService {
    @Inject(ResourceLoader)
    private resourceLoader: ResourceLoader;

    private objects = new Map<number, AttachedObject>();

    private isNetworked(attached: AttachedObject): boolean {
        return attached.weaponHash === undefined && !attached.skipNetworking;
    }

    public async attachObjectToPlayer(attached: AttachedObject): Promise<number> {
        const targetPed = attached.ped ?? PlayerPedId();
        const position = GetEntityCoords(targetPed) as Vector3;
        const isWeaponObject = attached.weaponHash !== undefined;

        if (!(await this.resourceLoader.loadModel(attached.model))) {
            return;
        }

        if (isWeaponObject) {
            await this.resourceLoader.loadWeaponAsset(attached.weaponHash, 31);
        }

        let object: number;
        if (isWeaponObject) {
            object = CreateWeaponObject(
                attached.weaponHash,
                0,
                position[0],
                position[1],
                position[2] - 1.0,
                true,
                0,
                0
            );
            if (attached.tint !== undefined) {
                SetWeaponObjectTintIndex(object, attached.tint);
            }
            for (const component of attached.weaponComponents ?? []) {
                GiveWeaponComponentToWeaponObject(object, component);
            }
        } else {
            object = CreateObject(
                GetHashKey(attached.model),
                position[0],
                position[1],
                position[2] - 1.0,
                true,
                true,
                true
            );
        }
        SetEntityAsMissionEntity(object, true, true);
        SetEntityCollision(object, false, true);
        if (this.isNetworked(attached)) {
            const netId = ObjToNet(object);
            SetNetworkIdCanMigrate(netId, false);
            TriggerServerEvent(ServerEvent.OBJECT_ATTACHED_REGISTER, netId);
        }

        AttachEntityToEntity(
            object,
            attached.entity ? attached.entity : targetPed,
            attached.entity ? attached.bone : GetPedBoneIndex(targetPed, attached.bone),
            attached.position[0],
            attached.position[1],
            attached.position[2],
            attached.rotation[0],
            attached.rotation[1],
            attached.rotation[2],
            true,
            true,
            false,
            true,
            attached.rotationOrder || 0,
            true
        );

        this.objects.set(object, attached);
        this.resourceLoader.unloadModel(attached.model);
        if (isWeaponObject) {
            this.resourceLoader.unloadWeaponAsset(attached.weaponHash);
        }

        return object;
    }

    public detachObjectToPlayer(entity: number) {
        const attached = this.objects.get(entity);
        if (!attached) {
            return;
        }

        SetEntityAsMissionEntity(entity, true, true);
        DetachEntity(entity, false, false);
        if (this.isNetworked(attached)) {
            TriggerServerEvent(ServerEvent.OBJECT_ATTACHED_UNREGISTER, ObjToNet(entity));
        }
        DeleteEntity(entity);
        this.objects.delete(entity);
    }

    public detachAll() {
        for (const entity of this.objects.keys()) {
            this.detachObjectToPlayer(entity);
        }
    }
}
