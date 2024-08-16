import {Injectable} from "../../core/decorators/injectable";
import {AreaFire, BuildingFire, Fire, SCALE_FIRE_MAP} from "../../shared/fire/fire";
import {BUILDING_FIRE_LIST} from "../../shared/fire/building_fire";
import {Vector2} from "../../shared/polyzone/vector";
import {WATER_AREA} from "../../shared/fire/water";

@Injectable()
export class FireUtilsService {

  public generateAreaMatrix(fire: Fire, x: number, y: number, maxSize: number) {
    const matrix: AreaFire[][] = [];

    const range = [...Array(2*maxSize).keys()].map(i => i - maxSize + 1);

    for (const i of range) {
      let row: AreaFire[] = [];
      for (const j of range) {
        const areaX = (x + i) * SCALE_FIRE_MAP;
        const areaY = (y + j) * SCALE_FIRE_MAP;
        row.push(this.createArea(areaX, areaY));
      }
      matrix.push(this.setBuilding(row));
    }
    fire.areaMatrix = matrix;
  }

  private createArea(x: number, y: number): AreaFire {
    return {
      position: [x, y],
      isOnFire: false,
      intensity: 0,
      building: undefined,
      type: 'NEUTRAL'
    }
  }

  private setBuilding(row: AreaFire[]): AreaFire[] {
    const x = row[0].position[0];
    const minY = row[0].position[1];
    const maxY = row[row.length - 1].position[1];

    const filterBuilding = this.getIntersectingBuildings(BUILDING_FIRE_LIST, x, minY, maxY);

    for (const building of filterBuilding) {
      const coordinates: Vector2[] = [];
      const minX = Math.min(building.topLeft[0], building.bottomRight[0]);
      const maxX = Math.max(building.topLeft[0], building.bottomRight[0]);
      const minY = Math.min(building.topLeft[1], building.bottomRight[1]);
      const maxY = Math.max(building.topLeft[1], building.bottomRight[1]);
      for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
          coordinates.push([x, y]);
        }
      }

      for (const area of row) {
        if (coordinates.find(coordinate => coordinate[0] === area.position[0] && coordinate[1] === area.position[1])) {
          area.type = 'BUILDING';
          area.building = building;
        }
      }
    }

    row = this.setWater(row);

    return row;
  }

  private setWater(row: AreaFire[]): AreaFire[] {
    const x = row[0].position[0];
    const minY = row[0].position[1];
    const maxY = row[row.length - 1].position[1];

    const filterWater = WATER_AREA.filter(water => {
      return (
        water.topLeft[0] <= x && water.topLeft[1] <= maxY &&
        water.bottomRight[0] >= x && water.bottomRight[1] >= minY
      );
    });

    for (const water of filterWater) {
      const coordinates: Vector2[] = [];
      for (let x = water.topLeft[0]; x <= water.bottomRight[0]; x++) {
        for (let y = water.topLeft[1]; y <= water.bottomRight[1]; y++) {
          coordinates.push([x, y]);
        }
      }

      for (const area of row) {
        if (coordinates.find(coordinate => coordinate[0] === area.position[0] && coordinate[1] === area.position[1])) {
          area.type = 'WATER';
        }
      }
    }
    return row;
  }

  private getIntersectingBuildings(buildingList: BuildingFire[], x: number, yMin: number, yMax: number): BuildingFire[] {
    return buildingList.filter(building => {
      const { topLeft, bottomRight } = building;
      const buildingMinX = topLeft[0];
      const buildingMaxX = bottomRight[0];
      const buildingMinY = topLeft[1];
      const buildingMaxY = bottomRight[1];

      return (
        (buildingMinX <= x && buildingMinY <= yMax && buildingMinX >= x - 1 && buildingMinY >= yMin) ||
        (buildingMaxX <= x && buildingMinY <= yMax && buildingMaxX >= x - 1 && buildingMinY >= yMin) ||
        (buildingMinX <= x && buildingMaxY <= yMax && buildingMinX >= x - 1 && buildingMaxY >= yMin) ||
        (buildingMaxX <= x && buildingMaxY <= yMax && buildingMaxX >= x - 1 && buildingMaxY >= yMin)
      );
    });
  }

}