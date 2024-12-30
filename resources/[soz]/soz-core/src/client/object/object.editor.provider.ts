import { Once, OnceStep, OnNuiEvent } from '@public/core/decorators/event';
import { Inject } from '@public/core/decorators/injectable';
import { Provider } from '@public/core/decorators/provider';
import { Tick, TickInterval } from '@public/core/decorators/tick';
import { uuidv4, wait } from '@public/core/utils';
import { NuiEvent } from '@public/shared/event';
import { ObjectEditorOptions, WorldObject } from '@public/shared/object';
import { getDistance, Vector3, Vector4 } from '@public/shared/polyzone/vector';

import { Control } from '../../shared/input';
import { MenuType } from '../../shared/nui/menu';
import { Notifier } from '../notifier';
import { NuiMenu } from '../nui/nui.menu';
import { CircularCameraProvider } from './circular.camera.provider';
import { ObjectService } from './object.service';

export const PROP_MAX_DISTANCE = 50.0;

type CurrentObject = {
    edited: boolean;
    matrix: Float32Array;
    position: Vector4;
    entity: number;
    model: number;
    options: ObjectEditorOptions;
    startingObject: WorldObject;
    previousPosition: Vector4;
    resolver: (object: WorldObject | null) => void;
};

@Provider()
export class ObjectEditorProvider {
    @Inject(NuiMenu)
    private nuiMenu: NuiMenu;

    @Inject(CircularCameraProvider)
    private circularCamera: CircularCameraProvider;

    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(ObjectService)
    private objectService: ObjectService;

    private currentObject: CurrentObject | null;

    @Once(OnceStep.Start)
    public async onInit() {
        RegisterKeyMapping('+gizmoSelect', 'Gizmo : Sélectionner un axe.', 'MOUSE_BUTTON', 'MOUSE_LEFT');
        RegisterKeyMapping('+gizmoTranslation', 'Gizmo : Mode Translation', 'keyboard', 'T');
        RegisterKeyMapping('+gizmoRotation', 'Gizmo : Mode Rotation', 'keyboard', 'R');
        RegisterKeyMapping('+gizmoScale', 'Giszmo : Mode Scale', 'keyboard', 'S');
        RegisterKeyMapping('+gizmoLocal', 'Gizmo : Coordonnées locales', 'keyboard', 'L');
    }

    public async createOrUpdateObject(
        model: number,
        options?: Partial<ObjectEditorOptions>,
        existingObject: WorldObject | null = null
    ): Promise<WorldObject | null> {
        if (this.currentObject) {
            return existingObject;
        }

        const ped = PlayerPedId();
        const position = existingObject?.position
            ? existingObject?.position
            : ([...(GetOffsetFromEntityInWorldCoords(ped, 0, 2.0, 0) as Vector3), 0] as Vector4);

        const initialObject: WorldObject = {
            model,
            position,
            id: existingObject?.id || uuidv4(),
            placeOnGround: existingObject?.placeOnGround || false,
            noCollision: true,
            matrix: existingObject?.matrix,
            invisible: false,
            rotation: existingObject?.rotation,
        };

        const objectEntity = await this.objectService.createObject(initialObject);

        if (!objectEntity) {
            return existingObject;
        }

        const editorOptions: ObjectEditorOptions = {
            onDrawCallback: () => {},
            maxDistance: PROP_MAX_DISTANCE,
            allowDelete: false,
            allowRotation: true,
            allowScale: true,
            allowToggleCollision: false,
            allowToggleSnap: false,
            context: 'hammer',
            collision: !existingObject?.noCollision || false,
            snapToGround: existingObject?.placeOnGround || false,
            ...options,
        };

        const promise = new Promise<WorldObject>(resolver => {
            this.currentObject = {
                edited: !!existingObject,
                position,
                entity: objectEntity,
                model,
                matrix: this.getEntityMatrix(objectEntity),
                options: editorOptions,
                startingObject: initialObject,
                previousPosition: position,
                resolver,
            };
        });

        promise.finally(() => {
            LeaveCursorMode();

            if (this.currentObject && this.currentObject.entity) {
                DeleteEntity(this.currentObject.entity);
                this.currentObject.entity = null;
            }

            if (this.nuiMenu.getOpened() === MenuType.ObjectEditor) {
                this.nuiMenu.closeMenu();
            }

            this.circularCamera.deleteCamera();
            this.currentObject = null;
        });

        SetEntityAlpha(objectEntity, 200, false);

        await wait(0);

        this.refreshObjectPositionFromGame();

        EnterCursorMode();

        this.circularCamera.createCamera([position[0], position[1], position[2]]);

        this.nuiMenu.openMenu(MenuType.ObjectEditor, editorOptions);

        return promise;
    }

    @Tick(TickInterval.EVERY_FRAME)
    public async drawEditorLoop() {
        if (!this.currentObject) {
            return;
        }

        if (!DoesEntityExist(this.currentObject.entity)) {
            return;
        }

        DisableAllControlActions(0);

        const matrix = this.getEntityMatrix(this.currentObject.entity);
        const changed = DrawGizmo(matrix as any, `Gismo_editor_${this.currentObject.entity}`);

        if (changed) {
            if (!this.currentObject.options.collision) {
                this.applyEntityMatrix(this.currentObject.entity, matrix);
            } else {
                this.applyEntityNormalizedMatrix(this.currentObject.entity, matrix);
            }
        }

        const position = GetEntityCoords(this.currentObject.entity) as Vector3;

        if (this.currentObject.options.snapToGround && getDistance(position, this.currentObject.position) > 0.001) {
            PlaceObjectOnGroundProperly(this.currentObject.entity);
            this.refreshObjectPositionFromGame();
        }

        // Check distance between the object and the player
        if (IsDisabledControlJustReleased(0, Control.Attack)) {
            const pedPosition = GetEntityCoords(PlayerPedId()) as Vector3;
            const distance = getDistance(pedPosition, this.currentObject.position);

            if (distance > this.currentObject.options.maxDistance) {
                this.notifier.notify('Vous ne pouvez pas déplacer ce prop plus loin ! Rapprochez vous.', 'error');

                SetEntityCoordsNoOffset(
                    this.currentObject.entity,
                    this.currentObject.previousPosition[0],
                    this.currentObject.previousPosition[1],
                    this.currentObject.previousPosition[2],
                    false,
                    false,
                    false
                );

                return;
            }

            this.currentObject.previousPosition = this.currentObject.position;

            this.circularCamera.updateTarget([
                this.currentObject.position[0],
                this.currentObject.position[1],
                this.currentObject.position[2],
            ]);
        }

        this.currentObject.options.onDrawCallback(this.getWorldObject(this.currentObject));

        if (IsDisabledControlJustPressed(0, 25)) {
            LeaveCursorMode();
        }

        if (IsDisabledControlJustReleased(0, 25)) {
            EnterCursorMode();
        }
    }

    @OnNuiEvent(NuiEvent.ObjectEditorReset)
    public async resetPlacement({
        position,
        rotation,
        scale,
    }: {
        position?: boolean;
        rotation?: boolean;
        scale?: boolean;
    }) {
        if (!this.currentObject) {
            return;
        }

        if (position) {
            SetEntityCoordsNoOffset(
                this.currentObject.entity,
                this.currentObject.startingObject.position[0],
                this.currentObject.startingObject.position[1],
                this.currentObject.startingObject.position[2],
                false,
                false,
                false
            );
        }

        if (rotation) {
            SetEntityHeading(this.currentObject.entity, this.currentObject.startingObject.position[3]);

            if (this.currentObject.startingObject.rotation) {
                SetEntityRotation(
                    this.currentObject.entity,
                    this.currentObject.startingObject.rotation[0],
                    this.currentObject.startingObject.rotation[1],
                    this.currentObject.startingObject.rotation[2],
                    0,
                    false
                );
            }
        }

        if (scale) {
            const rot = GetEntityRotation(this.currentObject.entity);

            SetEntityRotation(this.currentObject.entity, rot[0], rot[1], rot[2], 0, false);
        }
    }

    @OnNuiEvent<{ menuType: MenuType }>(NuiEvent.MenuClosed)
    public async onCloseMenu({ menuType }) {
        if (menuType !== MenuType.ObjectEditor) {
            return;
        }

        await this.cancel();
    }

    @OnNuiEvent(NuiEvent.ObjectEditorCancel)
    public async cancel() {
        if (!this.currentObject) {
            return;
        }

        this.currentObject.resolver(this.currentObject.edited ? this.currentObject.startingObject : null);
    }

    @OnNuiEvent(NuiEvent.ObjectEditorDelete)
    public async delete() {
        if (!this.currentObject) {
            return;
        }

        this.currentObject.resolver(null);
    }

    @OnNuiEvent(NuiEvent.ObjectEditorSave)
    public async save() {
        if (!this.currentObject) {
            return;
        }

        this.currentObject.resolver(this.getWorldObject(this.currentObject));
    }

    @OnNuiEvent(NuiEvent.ObjectEditorToggleCollision)
    public async toggleCollision({ collision }: { collision: boolean }) {
        if (!this.currentObject) {
            return;
        }

        this.currentObject.options.collision = collision;

        // Really needed ?
        SetEntityRotation(this.currentObject.entity, 0, 0, 0, 0, false);
        const rot = GetEntityRotation(this.currentObject.entity);
        SetEntityRotation(this.currentObject.entity, rot[0], rot[1], rot[2], 0, false);
    }

    @OnNuiEvent(NuiEvent.ObjectEditorToggleSnap)
    public async toggleSnap({ snap }: { snap: boolean }) {
        if (!this.currentObject) {
            return;
        }

        this.currentObject.options.snapToGround = snap;

        if (snap) {
            PlaceObjectOnGroundProperly_2(this.currentObject.entity);
        }
    }

    private getWorldObject(currentObject: CurrentObject): WorldObject {
        const position = GetEntityCoords(currentObject.entity) as Vector3;
        const heading = GetEntityHeading(currentObject.entity);
        const rotation = GetEntityRotation(currentObject.entity);
        const matrix = this.getEntityMatrix(currentObject.entity);

        return {
            id: currentObject.startingObject.id,
            model: currentObject.model,
            position: [position[0], position[1], position[2], heading],
            rotation: [rotation[0], rotation[1], rotation[2]],
            matrix,
            placeOnGround: currentObject.options.snapToGround,
            noCollision: !currentObject.options.collision,
        };
    }

    private refreshObjectPositionFromGame() {
        if (!this.currentObject) {
            return;
        }

        const position = GetEntityCoords(this.currentObject.entity) as Vector3;
        const heading = GetEntityHeading(this.currentObject.entity);

        this.currentObject.position = [position[0], position[1], position[2], heading];
        this.currentObject.matrix = this.getEntityMatrix(this.currentObject.entity);
    }

    private applyEntityMatrix(entity: number, matrix: Float32Array) {
        SetEntityMatrix(
            entity,
            matrix[4],
            matrix[5],
            matrix[6], // Right
            matrix[0],
            matrix[1],
            matrix[2], // Forward
            matrix[8],
            matrix[9],
            matrix[10], // Up
            matrix[12],
            matrix[13],
            matrix[14] // Position
        );
    }

    private applyEntityNormalizedMatrix(entity: number, matrix: Float32Array) {
        const norm_F = Math.sqrt(matrix[0] ** 2 + matrix[1] ** 2);
        SetEntityMatrix(
            entity,
            -matrix[1] / norm_F,
            matrix[0] / norm_F,
            0, // Right
            matrix[0] / norm_F,
            matrix[1] / norm_F,
            0, // Forward
            0,
            0,
            1, // Up
            matrix[12],
            matrix[13],
            matrix[14] // Position
        );
    }

    private getEntityMatrix(entity: number): Float32Array {
        const [f, r, u, a] = GetEntityMatrix(entity);

        return new Float32Array([r[0], r[1], r[2], 0, f[0], f[1], f[2], 0, u[0], u[1], u[2], 0, a[0], a[1], a[2], 1]);
    }
}
