import { VehicleLockProvider } from '@public/client/vehicle/vehicle.lock.provider';
import { wait } from '@public/core/utils';
import { getDistance, Vector3 } from '@public/shared/polyzone/vector';

import { OnEvent, OnNuiEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Tick, TickInterval } from '../../core/decorators/tick';
import { ClientEvent, NuiEvent, ServerEvent } from '../../shared/event';
import {
    AwdRatingBonus,
    GeneralControleDifficulty,
    GeneralSinkageSpeed,
    GeneralTractionLoss,
    GeneralTractionSpeedLoss,
    RefreshCalcTractionWithUpgrade,
    RefreshHandleLossVehControl,
    RefreshProcessSurfaceCalculation,
    ResetVehicleTireColiderSideStep,
    RoadSideHandling,
    sinkDepthStateKey,
    SuspensionRefresh,
    UnknownVehData,
    UnknowVehicleSurfaceData,
    UnknowVehWheelType,
    VehBacklist,
    VehData,
    VehicleSurfaceData,
    VehicleZoneDefinition,
    VehicleZoneModifier,
    VehWheelTypeData,
    WheelColliderSizeStateKey,
    WheelSizeStateKey,
} from '../../shared/vehicle/offroad';
import { VehicleSeat } from '../../shared/vehicle/vehicle';
import { DrawService } from '../draw.service';
import { NoClipProvider } from '../utils/noclip.provider';
import { VehicleStateService } from './vehicle.state.service';

@Provider()
export class VehicleOffroadProvider {
    public displayDebugSurface = false;
    private controlLossTimeDebug = 0;
    private debugMaxSpeed = 0;

    private allWheels = [
        { boneName: 'wheel_lf', wheelIdx: 0 },
        { boneName: 'wheel_rf', wheelIdx: 1 },
        { boneName: 'wheel_lr', wheelIdx: 2 },
        { boneName: 'wheel_rr', wheelIdx: 3 },
        { boneName: 'wheel_lm1', wheelIdx: 4 },
        { boneName: 'wheel_rm1', wheelIdx: 5 },
        { boneName: 'wheel_lm2', wheelIdx: 6 },
        { boneName: 'wheel_rm2', wheelIdx: 7 },
        { boneName: 'wheel_lm3', wheelIdx: 8 },
        { boneName: 'wheel_rm3', wheelIdx: 9 },
    ];
    private allBikeWheels = [
        { boneName: 'wheel_lr', wheelIdx: 0 },
        { boneName: 'wheel_lf', wheelIdx: 1 },
    ];
    private allQuadBikeWheels = [
        { boneName: 'wheel_lf', wheelIdx: 0 },
        { boneName: 'wheel_lr', wheelIdx: 1 },
        { boneName: 'wheel_rr', wheelIdx: 2 },
    ];
    private filteredWheelData = {};

    private noSurfaceCalc = false;
    private isEnteringVehicleOrChangingSeat = false;

    private sinkDepth: Record<number, Array<number>> = {};
    private wheelDepth: Record<number, Array<number>> = {};

    private averageDepth = 0;
    private averageTraction = 100;
    private tractionWithUpgrade = 100;
    private averageSoftness = 0;
    private averageWheelsize = 0;
    private isVehOnRoad = true;

    private currentVehAttachedToCargobob: number;
    public hasBeenThroughNoClip = false;
    private hasBeenTpm = false;
    private vehBeenReseted: number;

    @Inject(DrawService)
    private draw: DrawService;

    @Inject(NoClipProvider)
    private noClipProvider: NoClipProvider;

    @Inject(VehicleStateService)
    private vehicleStateService: VehicleStateService;

    @Inject(VehicleLockProvider)
    private vehicleLockProvider: VehicleLockProvider;

    @OnNuiEvent(NuiEvent.AdminToggleNoSurfaceCalc)
    public async setNoSurfaceCalc(value: boolean): Promise<void> {
        this.noSurfaceCalc = value;

        if (this.getNoSurfaceCalc()) {
            const playerPed = PlayerPedId();
            if (IsPedInAnyVehicle(playerPed, false)) {
                const playerVeh = GetVehiclePedIsIn(playerPed, false);
                if (this.vehBeenReseted) {
                    this.vehBeenReseted = playerVeh;
                }
                return;
            }
        }

        this.vehBeenReseted = undefined;
    }

    @OnEvent(ClientEvent.VEH_FEATURE_SURFACE_RESET)
    public async onResetVehSurfaceEffectIfSurfaceHard(vehNetId: number) {
        const playerVeh = NetworkGetEntityFromNetworkId(vehNetId);
        await this.resetVehSurfaceEffectIfSurfaceHard(playerVeh);
    }

    @OnEvent(ClientEvent.VEH_HAS_BEEN_TPM)
    public async onSetHasBeenTpm() {
        this.hasBeenTpm = true;
    }

    @OnNuiEvent(NuiEvent.AdminToggleDisplaySurfaceDebug)
    public async debugSurfaceTrigger(value: boolean): Promise<void> {
        this.displayDebugSurface = value;
    }

    @Tick(RefreshProcessSurfaceCalculation)
    public async processSurfaceCalculationTick() {
        if (this.isEnteringVehicleOrChangingSeat) {
            await wait(1000);
            return;
        }

        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();
        if (!playerPed || !playerVeh || this.isVehBlacklisted(playerVeh)) {
            this.resetCurrentAndDebugValue();
            await wait(1000);
            return;
        }

        if (this.noClipProvider.IsNoClipMode()) {
            await wait(1000);
            return;
        }

        await this.processSurfaceCalculation(playerVeh);
    }

    public async processSurfaceCalculation(playerVeh: number) {
        if (this.hasBeenThroughNoClip) {
            if (!IsVehicleStopped(playerVeh)) {
                await wait(100);
                await this.resetVehSurfaceEffect(playerVeh);
                this.hasBeenThroughNoClip = false;
            }
            await wait(1000);
            return;
        }

        if (this.hasBeenTpm) {
            if (!IsVehicleStopped(playerVeh)) {
                await wait(100);
                await this.resetVehSurfaceEffect(playerVeh);
                this.hasBeenTpm = false;
            }
            await wait(1000);
            return;
        }

        if (this.getNoSurfaceCalc()) {
            if (this.vehBeenReseted !== playerVeh) {
                this.vehBeenReseted = playerVeh;
                await this.resetVehSurfaceEffect(playerVeh);
            }
            await wait(1000);
            return;
        }

        const shouldAddSleepTime = this.averageDepth === 0;

        const playerVehCoords = GetEntityCoords(playerVeh);
        this.isVehOnRoad = IsPointOnRoad(playerVehCoords[0], playerVehCoords[1], playerVehCoords[2], playerVeh);

        const rainLevel = GetRainLevel();
        const vehMass = GetVehicleHandlingFloat(playerVeh, 'CHandlingData', 'fMass');
        const vehSpeed = GetEntitySpeed(playerVeh);
        const wheelType = GetVehicleWheelType(playerVeh);

        let anyChanges = false;

        let averageDepth = 0;
        let averageWheelSizes = 0;
        let averageTraction = 0;
        let averageSoftness = 0;

        const wheelCount = GetVehicleNumberOfWheels(playerVeh);
        for (let wheelIdx = 0; wheelIdx < wheelCount; wheelIdx++) {
            const [, surfaceData] = this.getVehicleWheelSurfaceIdAndData(playerVeh, wheelIdx);

            const vehRealWheelSize = await this.getRealVehicleWheelTireColliderSize(playerVeh, wheelIdx);

            if (vehRealWheelSize >= 0.75) {
                if (this.averageDepth > 0) {
                    this.averageDepth = 0;
                    this.averageWheelsize = 0;
                }
                continue;
            }

            let realDepth = surfaceData.depth * 0.001;

            if (this.isZoneBlacklisted()) {
                realDepth = 0;
            }

            if (RoadSideHandling.enable) {
                if (this.getNearestRoadDistance(playerVeh) <= RoadSideHandling.distanceThreshold) {
                    realDepth *= RoadSideHandling.depthMultiplier;
                }
            }

            const [, zoneData] = this.getZoneNameAndData(playerVehCoords);
            realDepth *= zoneData?.depthMultiplier || 1;

            this.sinkDepth[playerVeh] ??= [];
            let currentSinkDepth =
                this.sinkDepth[playerVeh][wheelIdx] || Entity(playerVeh).state[`${sinkDepthStateKey}${wheelIdx}`] || 0;
            this.sinkDepth[playerVeh][wheelIdx] ??= 0;

            const sinkageSpeed = this.calcSinkageSpeed(
                playerVeh,
                wheelIdx,
                rainLevel,
                vehMass,
                vehSpeed,
                wheelType,
                surfaceData
            );

            if (realDepth > currentSinkDepth || sinkageSpeed < 0) {
                currentSinkDepth = Math.max(0, currentSinkDepth + realDepth * sinkageSpeed);
            }

            if (currentSinkDepth > realDepth) {
                currentSinkDepth = realDepth;
            }

            if (Math.abs(this.sinkDepth[playerVeh][wheelIdx] - currentSinkDepth) > 0.001) {
                Entity(playerVeh).state.set(`${sinkDepthStateKey}${wheelIdx}`, currentSinkDepth, true);
            }
            this.sinkDepth[playerVeh][wheelIdx] = currentSinkDepth;

            const wheelDepth = Math.max(vehRealWheelSize - this.sinkDepth[playerVeh][wheelIdx], 0.12);
            const realWheelDepth = this.isVehOnRoad ? vehRealWheelSize : wheelDepth;

            averageWheelSizes += vehRealWheelSize;
            averageDepth += vehRealWheelSize - realWheelDepth;
            averageSoftness += surfaceData.softness;

            const traction = 100 - Math.floor((100 - surfaceData.traction) * (zoneData?.tractionMultiplier || 1));
            averageTraction += traction;

            this.wheelDepth[playerVeh] ??= [];
            this.wheelDepth[playerVeh][wheelIdx] ??= 0;

            if (Math.abs(this.wheelDepth[playerVeh][wheelIdx] - realWheelDepth) > 0.001) {
                anyChanges = true;

                Entity(playerVeh).state.set(`${WheelColliderSizeStateKey}${wheelIdx}`, realWheelDepth, true);
            }

            this.wheelDepth[playerVeh][wheelIdx] = realWheelDepth;
        }

        if (anyChanges) {
            await this.handleVehicleDepth(playerVeh, true);
        }

        if (wheelCount !== 0) {
            averageDepth /= wheelCount;
            averageWheelSizes /= wheelCount;
            averageTraction /= wheelCount;
            averageSoftness /= wheelCount;
        }
        this.averageDepth = averageDepth;
        this.averageWheelsize = averageWheelSizes;
        this.averageTraction = averageTraction;
        this.averageSoftness = averageSoftness;

        if (shouldAddSleepTime) {
            await wait(RefreshProcessSurfaceCalculation);
        }
    }

    @Tick(RefreshHandleLossVehControl)
    public async handleLossVehControlTick() {
        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();

        if (!playerPed || !playerVeh || this.featureDisableForAdmin()) {
            await wait(1000);
            return;
        }

        if (this.isVehBlacklisted(playerVeh) || this.averageDepth <= 0.05) {
            this.controlLossTimeDebug = 0;
            await wait(500);
            return;
        }

        await this.handleLossVehControl(playerVeh);
    }

    public async handleLossVehControl(playerVeh: number) {
        let upgradeRating =
            this.getVehicleUpgradesRating(playerVeh) +
            this.getTurningRating(playerVeh) +
            this.wheelClassRating(playerVeh);
        if (this.isVehAwd(playerVeh)) {
            upgradeRating = (upgradeRating + AwdRatingBonus) * 1.3;
        }

        let controlLossTime = Math.floor(
            Math.max(
                0,
                Math.floor(this.averageDepth * 820 * GeneralControleDifficulty) *
                    Math.max(0.9, this.averageSoftness / 70) -
                    upgradeRating
            )
        );

        if (this.isVehOnRoad) {
            controlLossTime = Math.min(controlLossTime, 50);
        }

        this.controlLossTimeDebug = controlLossTime;

        if (Math.abs(GetVehicleThrottleOffset(playerVeh)) > 0.1) {
            SetVehicleDirtLevel(playerVeh, GetVehicleDirtLevel(playerVeh) + 0.1);
        }

        if (GetVehicleClass(playerVeh) == 8) {
            SetVehicleHandbrake(playerVeh, true);
            await wait(Math.min(200, controlLossTime));
            SetVehicleHandbrake(playerVeh, false);
        } else {
            SetVehicleBurnout(playerVeh, true);
            await wait(controlLossTime);
            SetVehicleBurnout(playerVeh, false);
            if (controlLossTime > 250) {
                SetVehicleBurnout(playerVeh, true);
            }
        }
    }

    @Tick(RefreshCalcTractionWithUpgrade)
    public async calcTractionWithUpgradeTick() {
        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();

        if (!playerPed || !playerVeh || this.featureDisableForAdmin()) {
            await wait(1000);
            return;
        }

        if (this.isVehBlacklisted(playerVeh) || this.isZoneBlacklisted()) {
            await wait(500);
            return;
        }

        await this.calcTractionWithUpgrade(playerVeh);

        if (this.tractionWithUpgrade > 95) {
            await wait(500);
            return;
        }
    }

    public async calcTractionWithUpgrade(playerVeh: number) {
        let vehTraction = this.averageTraction;

        const wheelData = this.getWheelData(GetVehicleWheelType(playerVeh));
        if (!this.isSurfaceSoft(this.averageSoftness)) {
            vehTraction += wheelData.tractionOnHard;
        } else {
            vehTraction += wheelData.tractionOnSoft;
        }

        if (RoadSideHandling.enable) {
            if (this.getNearestRoadDistance(playerVeh) <= RoadSideHandling.distanceThreshold) {
                vehTraction = 100 - Math.floor((100 - vehTraction) * RoadSideHandling.tractionMultiplier);
            }
        }

        this.tractionWithUpgrade = vehTraction;
    }

    @Tick(RefreshCalcTractionWithUpgrade)
    public async handleTractionVehLossTick() {
        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();

        if (!playerPed || !playerVeh) {
            await wait(1000);
            return;
        }

        if (this.getNoSurfaceCalc() || this.tractionWithUpgrade > 95) {
            await wait(500);
            return;
        }

        const wheelData = this.getWheelData(GetVehicleWheelType(playerVeh));
        if (
            this.getVehicleDrift(playerVeh) > wheelData.driftThreshold &&
            (Math.abs(GetVehicleThrottleOffset(playerVeh)) > 0.1 || GetEntitySpeed(playerVeh) > 5.0) &&
            Math.abs(GetVehicleSteeringAngle(playerVeh)) > 0.2
        ) {
            if (this.tractionWithUpgrade > 80) {
                await wait(100);
            }
            SetVehicleReduceTraction(playerVeh, 1);
            SetVehicleReduceGrip(playerVeh, true);
            await wait(200 - this.averageTraction * GeneralTractionLoss);
            SetVehicleReduceTraction(playerVeh, 0);
            SetVehicleReduceGrip(playerVeh, false);
        } else {
            await wait(500);
        }
    }

    @Tick(RefreshCalcTractionWithUpgrade)
    public async handleTractionVehMaxTick() {
        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();

        if (!playerPed || !playerVeh) {
            await wait(1000);
            return;
        }

        await this.handleTractionVehMax(playerVeh);
    }

    public async handleTractionVehMax(playerVeh: number) {
        if (this.getNoSurfaceCalc()) {
            await wait(500);
            return;
        }

        if (this.tractionWithUpgrade > 95) {
            this.debugMaxSpeed = 0;
            await this.tryUpdateSpeedLimit(playerVeh, 0);
            await wait(500);
            return;
        }

        const vehData = this.getVehData(playerVeh);
        const tractionSpeedLoss = this.isSurfaceSoft(this.averageSoftness)
            ? vehData.tractionSpeedLostOnSoft
            : vehData.tractionSpeedLostOnHard;
        if (tractionSpeedLoss < 100) {
            const maxSpeed =
                Math.pow(
                    GetVehicleHandlingFloat(playerVeh, 'CHandlingData', 'fInitialDriveMaxFlatVel'),
                    Math.min(Math.max(25, this.tractionWithUpgrade) / GeneralTractionSpeedLoss, 100) / 100
                ) *
                (tractionSpeedLoss / 100);
            this.debugMaxSpeed = maxSpeed;
            if (maxSpeed > 0 && GetEntitySpeed(playerVeh) >= maxSpeed) {
                SetVehicleHandbrake(playerVeh, true);

                while (GetEntitySpeed(playerVeh) >= maxSpeed) {
                    await wait(10);
                }

                SetVehicleHandbrake(playerVeh, false);
            }
            await this.tryUpdateSpeedLimit(playerVeh, maxSpeed);
        } else {
            this.debugMaxSpeed = 0;
            await this.tryUpdateSpeedLimit(playerVeh, 0);
            await wait(500);
        }
    }

    @OnEvent(ClientEvent.BASE_ENTERED_VEHICLE)
    @OnEvent(ClientEvent.BASE_CHANGE_VEHICLE_SEAT)
    async applyCurrentPhysicsIfPlayerEnteringMainSeat(playerVeh: number, playerSeat: VehicleSeat) {
        if (playerVeh && VehicleSeat.Driver === playerSeat) {
            this.isEnteringVehicleOrChangingSeat = true;
            await wait(1);

            this.sinkDepth[playerVeh] = [];
            await this.calculateVehEffect(playerVeh);
            this.isEnteringVehicleOrChangingSeat = false;
        }
    }

    async calculateVehEffect(playerVeh: number) {
        await this.processSurfaceCalculation(playerVeh);
        await this.calcTractionWithUpgrade(playerVeh);

        await this.handleLossVehControl(playerVeh);
        // No need to call handleTractionVehLoss there, has it has no real effect on a stopped car
        await this.handleTractionVehMax(playerVeh);
    }

    @Tick(TickInterval.EVERY_FRAME)
    public async displayDebugSurfaceValue() {
        if (!this.displayDebugSurface) {
            await wait(3000);
            return;
        }

        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();
        if (!playerPed || !playerVeh) {
            await wait(3000);
            return;
        }

        const playerVehCoords = GetEntityCoords(playerVeh);
        const nearestRoad = this.getNearestRoadDistance(playerPed);
        this.draw.drawText3d(
            [playerVehCoords[0], playerVehCoords[1], playerVehCoords[2] - 0.3],
            `~w~Closest road: ${nearestRoad}`
        );

        const [vehZoneName, zoneData] = this.getZoneNameAndData(playerVehCoords);
        if (!zoneData) {
            this.draw.drawText3d(
                [playerVehCoords[0], playerVehCoords[1], playerVehCoords[2]],
                `~y~Zone: ${vehZoneName}`
            );
        } else {
            this.draw.drawText3d(
                [playerVehCoords[0], playerVehCoords[1], playerVehCoords[2]],
                `~y~Zone: ${vehZoneName} ~w~(${zoneData.name} | dpth: x${zoneData.depthMultiplier} | trcn: x${zoneData.tractionMultiplier})`
            );
        }

        const wheelDatas = this.getFilteredWheelData(playerVeh);
        for (const wheelData of wheelDatas) {
            const wheelCoord = GetWorldPositionOfEntityBone(playerVeh, wheelData.tireIdx);

            const [surfaceId, surfaceData] = this.getVehicleWheelSurfaceIdAndData(playerVeh, wheelData.wheelIdx);
            if (!surfaceData) {
                this.draw.drawText3d(
                    [wheelCoord[0], wheelCoord[1], wheelCoord[2] + 0.1],
                    `~g~[~w~${surfaceId}~g~]\nWheel Type: ${GetVehicleWheelType(
                        playerVeh
                    )}\n~r~Wheel: ${await this.getRealVehicleWheelTireColliderSize(
                        playerVeh,
                        1
                    )}\n~r~Colider: ${GetVehicleWheelTireColliderSize(playerVeh, 1)}`
                );
            } else {
                this.draw.drawText3d(
                    [wheelCoord[0], wheelCoord[1], wheelCoord[2] + 0.25],
                    `~g~[~w~${surfaceId}~g~]\n~w~${surfaceData.name}~g~\nTraction ${surfaceData.traction}\nDepth ${
                        surfaceData.depth
                    }\nSoftness ${surfaceData.softness}\nWheel Type: ${GetVehicleWheelType(playerVeh)}`
                );
                this.draw.drawText3d(
                    [wheelCoord[0], wheelCoord[1], wheelCoord[2] + 0.5],
                    `~r~Wheel: ${await this.getRealVehicleWheelTireColliderSize(
                        playerVeh,
                        wheelData.wheelIdx
                    )}\n~r~Colider: ${GetVehicleWheelTireColliderSize(playerVeh, wheelData.wheelIdx)}`
                );
            }
        }

        this.draw.drawText3d(
            [playerVehCoords[0], playerVehCoords[1], playerVehCoords[2] + 2],
            `~r~AverageDepth: ${this.averageDepth}\nIsOnRoad: ${this.isVehOnRoad}`
        );
        this.draw.drawText3d(
            [playerVehCoords[0], playerVehCoords[1], playerVehCoords[2] + 1.6],
            `~w~controlLossTimeDebug: ${this.controlLossTimeDebug}\n~w~TractionWithUpgrade: ${this.tractionWithUpgrade}\n~w~debugMaxSpeed: ${this.debugMaxSpeed}`
        );
    }

    @Tick(3000)
    public async resetVehclePickByCargobob() {
        const [playerPed, playerVeh] = this.getPlayerPedAndPlayerVeh();

        if (!playerPed || !playerVeh) {
            return;
        }

        if (GetEntityModel(playerVeh) !== GetHashKey('cargobob2')) {
            return;
        }

        const vehToReset = GetVehicleAttachedToCargobob(playerVeh);
        if (!vehToReset || this.currentVehAttachedToCargobob === vehToReset) {
            return;
        }

        TriggerServerEvent(ServerEvent.VEHICLE_RESET_SURFACE_STATE_TO_OWNER, NetworkGetNetworkIdFromEntity(playerVeh));
        this.currentVehAttachedToCargobob = vehToReset;
    }

    private async handleVehicleDepth(playerVeh: number, isCurrentVeh = false) {
        let didAnything = false;

        if (!DoesEntityExist(playerVeh)) {
            return didAnything;
        }

        const wheelCount = GetVehicleNumberOfWheels(playerVeh);
        if (wheelCount < 3) {
            return didAnything;
        }

        let state: any;
        if (isCurrentVeh) {
            state = this.wheelDepth[playerVeh];
        } else {
            state = Entity(playerVeh).state;
        }

        if (!state) {
            return didAnything;
        }

        const wheelTireTargetedSize = Array(wheelCount).fill(false);
        do {
            for (let wheelIdx = 0; wheelIdx < wheelCount; wheelIdx++) {
                if (wheelTireTargetedSize[wheelIdx]) {
                    continue;
                }

                let wheelDepth = 0;
                if (isCurrentVeh) {
                    wheelDepth = state[wheelIdx];
                } else {
                    wheelDepth = state[`${WheelColliderSizeStateKey}${wheelIdx}`];
                }

                if (!wheelDepth) {
                    wheelTireTargetedSize[wheelIdx] = true;
                    continue;
                }

                const currentVehicleWheelTireColliderSize = GetVehicleWheelTireColliderSize(playerVeh, wheelIdx);
                const newWheelDepth = Math.min(
                    currentVehicleWheelTireColliderSize + ResetVehicleTireColiderSideStep,
                    wheelDepth
                );

                if (newWheelDepth && newWheelDepth > 0.01 && newWheelDepth <= 1.5) {
                    if (Math.abs(currentVehicleWheelTireColliderSize - newWheelDepth) > 0.001) {
                        didAnything = true;
                        await this.setTireColliderSize(playerVeh, wheelIdx, newWheelDepth);
                    }
                }

                if (wheelDepth === newWheelDepth) {
                    wheelTireTargetedSize[wheelIdx] = true;
                }
            }
            await wait(1);
        } while (wheelTireTargetedSize.some(v => !v));
        return didAnything;
    }

    @Tick(500)
    public async applyDepthToFilteredVehicle() {
        const [, currentPlayerVeh] = this.getPlayerPedAndPlayerVeh();
        let shoudSleep = false;
        for (const playerVeh of GetGamePool('CVehicle')) {
            if (currentPlayerVeh === playerVeh) {
                continue;
            }
            const didSomething = this.handleVehicleDepth(playerVeh, false);
            if (didSomething) {
                shoudSleep = true;
            }
        }
        if (shoudSleep) {
            await wait(1000);
        }
    }

    private getFilteredWheelData(playerVeh: number) {
        if (!this.filteredWheelData[playerVeh]) {
            this.filteredWheelData[playerVeh] ??= [];

            let allWheelData = this.allWheels;
            if (IsThisModelABike(GetEntityModel(playerVeh))) {
                allWheelData = this.allBikeWheels;
            }

            if (IsThisModelAQuadbike(GetEntityModel(playerVeh)) && GetVehicleClass(playerVeh) === 8) {
                allWheelData = this.allQuadBikeWheels;
            }

            for (const wheelData of allWheelData) {
                const tyreBoneIdx = GetEntityBoneIndexByName(playerVeh, wheelData.boneName);
                if (tyreBoneIdx !== -1) {
                    this.filteredWheelData[playerVeh].push({ ...wheelData, tireIdx: tyreBoneIdx });
                }
            }
        }
        return this.filteredWheelData[playerVeh];
    }

    private async setTireColliderSize(playerVeh: number, wheelIdx: number, wheelDepth: number) {
        SetVehicleWheelTireColliderSize(playerVeh, wheelIdx, wheelDepth);
        if (SuspensionRefresh) {
            const flag = GetVehicleWheelFlags(playerVeh, wheelIdx);
            if (flag > 0) {
                SetVehicleWheelFlags(playerVeh, wheelIdx, flag + 2048);
                await wait(1);
                SetVehicleWheelFlags(playerVeh, wheelIdx, flag);
            }
            ActivatePhysics(playerVeh);
        }
    }

    private async getRealVehicleWheelTireColliderSize(playerVeh: number, wheelIdx: number) {
        let realWheelSize = Entity(playerVeh).state[`${WheelSizeStateKey}${wheelIdx}`];

        if (!realWheelSize) {
            realWheelSize = GetVehicleWheelTireColliderSize(playerVeh, wheelIdx);
            Entity(playerVeh).state.set(`${WheelSizeStateKey}${wheelIdx}`, realWheelSize, true);
        }

        return realWheelSize;
    }

    public getPlayerPedAndPlayerVeh() {
        const playerPed = PlayerPedId();
        if (!IsPedInAnyVehicle(playerPed, false)) {
            return [null, null];
        }

        const playerVeh = GetVehiclePedIsIn(playerPed, false);
        if (!playerVeh || GetPedInVehicleSeat(playerVeh, VehicleSeat.Driver) !== playerPed) {
            return [null, null];
        }

        return [playerPed, playerVeh];
    }

    private getVehicleWheelSurfaceIdAndData(playerVeh: number, wheelIdx: number) {
        const surfaceId = GetVehicleWheelSurfaceMaterial(playerVeh, wheelIdx);
        const surfaceData = VehicleSurfaceData[surfaceId] || UnknowVehicleSurfaceData;

        return [surfaceId, surfaceData];
    }

    private getZoneNameAndData(playerVehCoords: number[]) {
        const vehZoneName = GetNameOfZone(playerVehCoords[0], playerVehCoords[1], playerVehCoords[2]);
        const zoneData = VehicleZoneModifier?.[VehicleZoneDefinition[vehZoneName]];

        return [vehZoneName, zoneData];
    }

    private calcSinkageSpeed(
        playerVeh: number,
        wheelIdx: number,
        rainLevel: number,
        vehMass: number,
        vehSpeed: number,
        wheelType: number,
        surfaceData: any
    ) {
        let sinkageSpeed = 0.003 * (rainLevel * 2 + 1) * (1 + surfaceData.softness / 25);
        const realWheelSpeed = GetVehicleWheelSpeed(playerVeh, wheelIdx) - vehSpeed;
        sinkageSpeed *= Math.max(1, realWheelSpeed) * (Math.max(600, Math.min(2200, vehMass)) / 2000);

        if (realWheelSpeed < 1 && vehSpeed > 4) {
            sinkageSpeed -= 0.01 * (vehSpeed / 2);
        }

        sinkageSpeed *= RefreshProcessSurfaceCalculation / 200;

        const wheelData = this.getWheelData(wheelType);
        sinkageSpeed *= wheelData.sinkageSpeed;

        if (sinkageSpeed > 0) {
            sinkageSpeed *= GeneralSinkageSpeed;
        }

        return sinkageSpeed;
    }

    private getVehicleUpgradesRating(playerVeh: number) {
        return (
            this.wheelSizeRating() +
            this.suspensionHeightRating(playerVeh) +
            this.wheelCountRating(playerVeh) +
            Math.floor(this.massRating(playerVeh)) +
            this.classRating(playerVeh)
        );
    }

    private wheelSizeRating() {
        return Math.max(1, Math.floor(Math.max(-0.05, this.averageWheelsize - 0.35) * 250));
    }

    private suspensionHeightRating(playerVeh: number) {
        const [min, max] = GetVehicleSuspensionBounds(playerVeh);
        const suspensionHeight = Math.abs(min[2]) + max[2];

        return Math.floor(Math.max(0.0, suspensionHeight - 1.6) * 150);
    }

    private wheelCountRating(playerVeh: number) {
        return Math.max(0, GetVehicleNumberOfWheels(playerVeh) - 4) * 9;
    }

    private getVehicleDrift(playerVeh: number) {
        return (
            Math.abs(GetVehicleWheelTractionVectorLength(playerVeh, 3)) +
            Math.abs(GetVehicleWheelTractionVectorLength(playerVeh, 2))
        );
    }

    private massRating(playerVeh: number) {
        const vehMass = GetVehicleHandlingFloat(playerVeh, 'CHandlingData', 'fMass');

        let rating = 0;
        if (vehMass > 1300) {
            rating = (1300 - vehMass) / 60;
        } else {
            rating = (1300 - vehMass) / 10;
        }

        const wheelCount = GetVehicleNumberOfWheels(playerVeh);
        if (wheelCount === 2) {
            rating *= 0.15;
        } else if (wheelCount === 3) {
            rating *= 0.35;
        }

        return rating;
    }

    private classRating(playerVeh: number) {
        const vehData = this.getVehData(playerVeh);
        return vehData.rating;
    }

    private wheelClassRating(playerVeh: number) {
        const wheelData = this.getWheelData(GetVehicleWheelType(playerVeh));
        return wheelData.rating;
    }

    private getTurningRating(playerVeh: number) {
        return Math.floor(Math.abs(GetVehicleSteeringAngle(playerVeh)) / 1.5);
    }

    private isVehAwd(playerVeh: number) {
        const fDriveBiasFront = GetVehicleHandlingFloat(playerVeh, 'CHandlingData', 'fDriveBiasFront');
        return fDriveBiasFront > 0.3 && fDriveBiasFront < 0.7;
    }

    private isVehBlacklisted(playerVeh: number) {
        const vehEntityModel = GetEntityModel(playerVeh);
        for (const model of VehBacklist.models) {
            if (vehEntityModel == GetHashKey(model)) {
                return true;
            }
        }

        const vehClass = GetVehicleClass(playerVeh);
        if (VehBacklist.classes[vehClass]) {
            return true;
        }

        return false;
    }

    private getWheelData(wheelType: number) {
        return VehWheelTypeData[wheelType] || UnknowVehWheelType;
    }

    private getVehData(playerVeh: number) {
        const vehEntityModel = GetEntityModel(playerVeh);
        for (const model of Object.keys(VehData.models)) {
            if (vehEntityModel == GetHashKey(model)) {
                return VehData.models[model];
            }
        }

        const vehClass = GetVehicleClass(playerVeh);
        return VehData.classes[vehClass] || UnknownVehData;
    }

    public async resetVehSurfaceEffect(playerVeh: number) {
        const [, currentPlayerVeh] = this.getPlayerPedAndPlayerVeh();
        if (playerVeh === currentPlayerVeh) {
            this.resetCurrentAndDebugValue();
        }

        const wheelCount = GetVehicleNumberOfWheels(playerVeh);
        this.sinkDepth[playerVeh] = [];
        this.wheelDepth[playerVeh] = [];
        for (let wheelIdx = 0; wheelIdx < wheelCount; wheelIdx++) {
            const realVehicleWheelTireColliderSize = await this.getRealVehicleWheelTireColliderSize(
                playerVeh,
                wheelIdx
            );

            Entity(playerVeh).state.set(
                `${WheelColliderSizeStateKey}${wheelIdx}`,
                realVehicleWheelTireColliderSize,
                true
            );
            this.wheelDepth[playerVeh][wheelIdx] = realVehicleWheelTireColliderSize;
        }
        await this.handleVehicleDepth(playerVeh, playerVeh == currentPlayerVeh);

        SetVehicleBurnout(playerVeh, false);
        await this.tryUpdateSpeedLimit(playerVeh, 0);
    }

    private resetCurrentAndDebugValue() {
        this.averageDepth = 0;
        this.averageTraction = 100;
        this.tractionWithUpgrade = 100;
        this.averageWheelsize = 0;
        this.averageSoftness = 0;

        this.debugMaxSpeed = 0;
        this.controlLossTimeDebug = 0;
    }

    public async resetVehSurfaceEffectIfSurfaceHard(playerVeh: number) {
        let averageSoftness = 0;
        const wheelCount = GetVehicleNumberOfWheels(playerVeh);
        for (let wheelIdx = 0; wheelIdx < wheelCount; wheelIdx++) {
            const [, surfaceData] = this.getVehicleWheelSurfaceIdAndData(playerVeh, wheelIdx);
            averageSoftness += surfaceData.softness;
        }
        if (wheelCount !== 0) {
            averageSoftness /= wheelCount;
        }

        const playerVehCoords = GetEntityCoords(playerVeh);
        if (
            !this.isSurfaceSoft(averageSoftness) ||
            IsPointOnRoad(playerVehCoords[0], playerVehCoords[1], playerVehCoords[2], playerVeh)
        ) {
            await this.resetVehSurfaceEffect(playerVeh);
        }
    }

    private isSurfaceSoft(softness: number) {
        return softness >= 10;
    }

    private isZoneBlacklisted() {
        return false;
    }

    private getNearestRoadDistance(source: number) {
        const coords = GetEntityCoords(source) as Vector3;
        const [, road1] = GetClosestVehicleNode(coords[0], coords[1], coords[2], 1.0, 3.0, 0);
        const dist1 = getDistance(road1 as Vector3, coords);

        return dist1;
    }

    public getNoSurfaceCalc() {
        return this.noSurfaceCalc;
    }

    private featureDisableForAdmin() {
        return this.getNoSurfaceCalc() || this.noClipProvider.IsNoClipMode();
    }

    private async tryUpdateSpeedLimit(playerVeh: number, speedLimitToSet: number) {
        const state = await this.vehicleStateService.getVehicleState(playerVeh);

        const speedLimiterLimit = state.speedLimit ? state.speedLimit / 3.6 - 0.25 : 0;
        if (speedLimitToSet === 0) {
            speedLimitToSet = speedLimiterLimit || 0;
        } else if (speedLimiterLimit && speedLimiterLimit > 0) {
            speedLimitToSet = Math.min(speedLimiterLimit, speedLimitToSet);
        }

        SetVehicleMaxSpeed(playerVeh, speedLimitToSet);
    }
}
