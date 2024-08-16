import {Vector2} from "../polyzone/vector";

export const SCALE_FIRE_MAP = 5

export type BuildingFire = {
  name: string,
  type: 'SHOP' | 'HOUSE',
  protectionPoints: number
  topLeft:Vector2,
  bottomRight:Vector2
}

export type AreaFire = {
  readonly position: Readonly<Vector2>,
  type: 'WATER' | 'NEUTRAL' | 'BUILDING',
  isOnFire: boolean,
  building?: BuildingFire,
  intensity: number
}

export type Fire = {
  center: Vector2,
  sizeMax: number,
  startDate: Date,
  areaMatrix: AreaFire[][],
  pointOnFire: {
    pos: Vector2,
    intensity: number,
    protectionPoints: number
  }[]
}