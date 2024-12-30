import { Inject, Injectable } from '@core/decorators/injectable';
import { BlipFactory } from '@public/client/blip';
import { PedFactory } from '@public/client/factory/ped.factory';
import { Notifier } from '@public/client/notifier';
import { NuiDispatch } from '@public/client/nui/nui.dispatch';
import { wait } from '@public/core/utils';
import { ServerEvent } from '@public/shared/event';
import { AllowedBusModel, busLines, busLinesConfig, BusStopTarif, NpcSkins, TaxiStatus } from '@public/shared/job/cjr';
import { getDistance, Vector4 } from '@public/shared/polyzone/vector';
import { getRandomInt, getRandomItem } from '@public/shared/random';

import { VehicleSeat } from '../../../shared/vehicle/vehicle';

@Injectable()
export class BusMissionService {
    @Inject(Notifier)
    public notifier: Notifier;

    @Inject(PedFactory)
    public pedFactory: PedFactory;

    @Inject(NuiDispatch)
    private dispatcher: NuiDispatch;

    @Inject(BlipFactory)
    private blipFactory: BlipFactory;

    private state: TaxiStatus = {
        horodateurDisplayed: false,
        horodateurStarted: false,
        busMissionInProgress: false,
        taxiMissionInProgress: false,
    };

    private busGroupHash = AddRelationshipGroup('BUS');

    private busStopNumber = 0;
    private busLineName = '';
    private savedBusLineName = null;
    private waitingPeds: number[] = [];
    private inBusPeds: number[] = [];
    private busVehicle = 0;
    private freeSeats: number[] = [];

    private updateState(newState: Partial<TaxiStatus>) {
        this.state = { ...this.state, ...newState };
        this.dispatcher.dispatch('taxi', 'setStatus', this.state);
    }

    public async cancelMission() {
        if (this.busStopNumber > 0) {
            this.notifier.notify(`Mission interrompue, tu as désservi(e) ~b~${this.busStopNumber}~s~ arrêts`, 'info');
        } else {
            this.notifier.notify('Mission annulée', 'error');
        }
        await this.clearMission();
        return true;
    }

    public async clearMission() {
        this.endMission();
        this.blipFactory.remove('nextBusStop');
        if (this.inBusPeds && this.inBusPeds.length > 0) {
            for (let index = 0; index < this.inBusPeds.length; index++) {
                const inBusPed = this.inBusPeds[index];
                TaskLeaveVehicle(inBusPed, this.busVehicle, 0);
                SetEntityAsNoLongerNeeded(inBusPed);
            }
        }

        if (this.waitingPeds && this.waitingPeds.length > 0) {
            for (let index = 0; index < this.waitingPeds.length; index++) {
                const waitingPed = this.waitingPeds[index];
                SetEntityAsNoLongerNeeded(waitingPed);
            }
        }

        this.inBusPeds = [];
        this.waitingPeds = [];
        this.busLineName = '';
        this.busStopNumber = 0;
        this.updateState({
            busMissionInProgress: false,
        });

        return true;
    }

    private validVehicle() {
        const ped = PlayerPedId();
        this.busVehicle = GetVehiclePedIsIn(ped, false);
        const model = GetEntityModel(this.busVehicle);

        return AllowedBusModel.includes(model) && GetPedInVehicleSeat(this.busVehicle, VehicleSeat.Driver) == ped;
    }

    private endMission() {
        if (this.busStopNumber !== 0 && this.busStopNumber > 1) {
            const money = this.busStopNumber * BusStopTarif;
            TriggerServerEvent(ServerEvent.TAXI_NPC_PAY, money);
        }
    }

    //mission pnj
    private async checkBusVehicle(): Promise<boolean> {
        if (!this.validVehicle()) {
            this.notifier.notify('Remontez dans le bus ou la mission sera annulée', 'warning');
            for (let i = 0; i < 120; i++) {
                await wait(1000);
                if (this.validVehicle()) {
                    return true;
                }
            }
            await this.cancelMission();
            return false;
        }
        return true;
    }

    private getFreeSeats() {
        const maxSeats = GetVehicleMaxNumberOfPassengers(this.busVehicle);
        for (let i = maxSeats - 1; i > -1; i--) {
            if (IsVehicleSeatFree(this.busVehicle, i) && !this.freeSeats.includes(i)) {
                this.freeSeats.push(i);
            }
        }
    }

    public async doBusService() {
        if (!this.validVehicle()) {
            this.notifier.notify("Vous n'êtes pas dans un bus.", 'error');
            return;
        }

        if (this.state.busMissionInProgress || this.state.taxiMissionInProgress) {
            this.notifier.notify('Vous êtes déjà en mission.', 'error');
            return;
        }

        await this.clearMission();

        this.updateState({
            busMissionInProgress: true,
        });

        this.busLineName = this.savedBusLineName ? this.savedBusLineName : getRandomItem(Object.keys(busLines));
        this.savedBusLineName = this.busLineName;

        this.busStopNumber = 0;
        this.notifier.notify(`Rends toi au premier arrêt de la ligne ~g~${this.busLineName}~s~.`);
        const busStopNumber = busLines[this.busLineName].length;
        for (let i = 0; this.busStopNumber < busStopNumber; i++) {
            if (!this.state.busMissionInProgress) {
                return;
            }
            this.busStopNumber = i;

            const busStop = busLines[this.busLineName][this.busStopNumber];
            const isTerminus = this.busStopNumber === busStopNumber - 1;
            const nextIsTerminus = this.busStopNumber === busStopNumber - 2;
            const isFirstStop = this.busStopNumber === 0;

            const getBlipName = () => {
                if (isTerminus) {
                    return 'Terminus';
                }
                if (isFirstStop) {
                    return 'Départ';
                }
                return 'Arrêt';
            };

            this.blipFactory.create('nextBusStop', {
                name: getBlipName(),
                coords: { x: busStop[0], y: busStop[1], z: busStop[2] },
                color: isFirstStop || isTerminus ? 2 : 3,
                sprite: 107,
                route: true,
                routeColor: isFirstStop || isTerminus ? 2 : 3,
            });

            this.waitingPeds = [];

            if (!isTerminus) {
                for (let i = 0; i < getRandomInt(busLinesConfig.minPedPerStops, busLinesConfig.maxPedPerStops); i++) {
                    const model = GetHashKey(getRandomItem(NpcSkins));
                    const newPed = await this.pedFactory.createPed({
                        model: model,
                        coords: {
                            x: busStop[0] - 1 + i * 0.5 * Math.random() * 3.5,
                            y: busStop[1] - 0.5 + Math.random() * 3.5,
                            z: busStop[2] - 1.0,
                            w: busStop[3],
                        },
                        blockevents: true,
                        animDict: 'anim@amb@casino@valet_scenario@pose_d@',
                        anim: 'base_a_m_y_vinewood_01',
                        flag: 49,
                        network: false,
                        isScriptHostPed: true,
                    });
                    PlaceObjectOnGroundProperly(newPed);
                    FreezeEntityPosition(newPed, true);

                    this.waitingPeds.push(newPed);
                }
            }

            while (this.state.busMissionInProgress) {
                const ped = PlayerPedId();
                const pos = GetEntityCoords(ped) as Vector4;
                const dist = getDistance(pos, busStop);

                if (!(await this.checkBusVehicle())) {
                    return;
                }
                if (dist < 15) {
                    if (IsVehicleStopped(GetVehiclePedIsIn(ped, false)) && this.validVehicle()) {
                        const pedsToLeave = isTerminus ? this.inBusPeds.length : getRandomInt(0, this.inBusPeds.length);

                        if (this.inBusPeds.length > 0) {
                            if (isTerminus) {
                                this.notifier.notify('Terminus, tout le monde descend.', 'success');
                            }

                            for (let index = 0; index < pedsToLeave; index++) {
                                const pedIndex = getRandomInt(0, this.inBusPeds.length - 1);

                                const inBusPed = this.inBusPeds[pedIndex];
                                TaskLeaveVehicle(inBusPed, this.busVehicle, 0);

                                this.inBusPeds.splice(pedIndex, 1);

                                await wait(1000);
                                SetEntityAsNoLongerNeeded(inBusPed);
                            }
                        }

                        await wait(1000);

                        if (!isTerminus) {
                            this.getFreeSeats();

                            let pedsCantGettingIn = 0;
                            for (const waitingPed of this.waitingPeds) {
                                ClearPedTasksImmediately(waitingPed);
                                FreezeEntityPosition(waitingPed, false);
                                if (this.freeSeats.length > 0) {
                                    TaskEnterVehicle(waitingPed, this.busVehicle, -1, this.freeSeats.pop(), 1.0, 1, 0);
                                    this.inBusPeds.push(waitingPed);
                                } else {
                                    SetEntityAsNoLongerNeeded(waitingPed);
                                    pedsCantGettingIn++;
                                }
                                await wait(500);
                            }

                            if (pedsCantGettingIn > 1) {
                                this.notifier.notify(
                                    `Il n'y'a plus de place, ces personnes prendront le prochain.`,
                                    'info'
                                );
                            } else if (pedsCantGettingIn === 1) {
                                this.notifier.notify(
                                    `Il n'y'a plus de place, cette personne prendra le prochain.`,
                                    'info'
                                );
                            }

                            if (pedsCantGettingIn !== this.waitingPeds.length) {
                                this.notifier.notify(`Attends que tout le monde soit installé.`, 'info');
                                let allPedsInBus = true;
                                await wait(this.waitingPeds.length - pedsCantGettingIn * 1000);
                                let maxTimer = 0;
                                do {
                                    maxTimer++;
                                    allPedsInBus = true;
                                    for (const inBusPed of this.inBusPeds) {
                                        if (GetVehiclePedIsIn(inBusPed, false) !== this.busVehicle) {
                                            allPedsInBus = false;
                                            await wait(300);
                                            break;
                                        }
                                    }
                                } while (!allPedsInBus && maxTimer < 30);
                            }
                        }

                        break;
                    }
                }
                await wait(100);
            }

            this.blipFactory.remove('nextBusStop');
            if (this.state.busMissionInProgress) {
                if (!isTerminus && !nextIsTerminus) {
                    this.notifier.notify(`Va au prochain ~b~arrêt~s~.`, 'info');
                } else if (nextIsTerminus) {
                    this.notifier.notify(`Rends-toi au ~g~terminus~s~.`, 'info');
                } else if (isTerminus) {
                    this.notifier.notify(`Tu as terminé ton service sur cette ligne.`, 'info');
                    this.savedBusLineName = null;
                    this.updateState({
                        busMissionInProgress: false,
                    });
                    this.clearMission();
                }
            }
        }

        return false;
    }
}
