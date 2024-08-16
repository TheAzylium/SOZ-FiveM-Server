import {Inject, Injectable} from "../../core/decorators/injectable";
import {Fire} from "../../shared/fire/fire";
import {Vector2, Vector3} from "../../shared/polyzone/vector";
import {uuidv4} from "../../core/utils";
import {FireUtilsService} from "./fire.utils.service";
import {Command} from "../../core/decorators/command";

@Injectable()
export class FireService {
  private READONLY_MAX_SIZE = 10;


  private fireList: Record<string, Fire> = {};

  @Inject(FireUtilsService)
  private fireUtilsService: FireUtilsService;


  public startFire(position: Vector2) {
    const id = uuidv4();
    this.fireList[id] = {
      center: position,
      sizeMax: this.READONLY_MAX_SIZE,
      startDate: new Date(),
      areaMatrix: [],
      pointOnFire: [],
    };
    this.fireUtilsService.generateAreaMatrix(this.fireList[id], position[0], position[1], this.READONLY_MAX_SIZE);
  }

  getFireList() {
    return this.fireList
  }





}