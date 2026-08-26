import { Vector3 } from './polyzone/vector';

export const TRAINING_ZONE_POLE_MODEL = 'prop_fnccorgm_02pole';
export const TRAINING_ZONE_FLAG_MODEL = 'prop_flag_sa_s';
export const TRAINING_ZONE_FLAG_ATTACH_HEIGHT = 1.8;
export const TRAINING_ZONE_FLAG_ROTATION: Vector3 = [0.0, 0.0, 0.0];
export const TRAINING_ZONE_MIN_RADIUS = 10.0;
export const TRAINING_ZONE_MAX_RADIUS = 200.0;
export const TRAINING_ZONE_FLAG_Z_OFFSET = 0.0;

export type TrainingZone = {
    position: Vector3;
    radius: number;
};
