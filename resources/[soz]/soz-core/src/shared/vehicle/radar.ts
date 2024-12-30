import { PyramidZone } from '@public/shared/polyzone/pyramid.zone';

import { Vector3, Vector4 } from '../polyzone/vector';

export const RADAR_ID_PREFIX = 'radar_';

export type Radar = {
    id: number;
    position: Vector4;
    speed: number;
    enabled: boolean;
    destroyed: boolean;
};

const RADAR_HEIGHT = 30;
const RADAR_RADIUS = 40;
const OFFSET: Vector3 = [0, 0, 0];

export const createRadarZone = (position: Vector4) => {
    return new PyramidZone(
        [position[0] + OFFSET[0], position[1] + OFFSET[1], position[2] + OFFSET[2]],
        RADAR_HEIGHT,
        position[3] - 90,
        RADAR_RADIUS
    );
};
