import { Vector3, Vector4 } from './polyzone/vector';

export type PhoneBooth = {
    number: string;
    coords: Vector4;
    name: string;
};

export type HandsetAnimProfile = {
    dictionary: string;
    introAnim: string;
    exitAnim: string;
};

export const PHONE_BOOTH_BILLING_INTERVAL = 30000;
export const PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL = 200;
export const PHONE_BOOTH_RING_TIMEOUT = 25000;
export const PHONE_BOOTH_MODEL = 'sf_prop_sf_phonebox_01b_s';

export const HANDSET_ANIM_PROFILE: HandsetAnimProfile = {
    dictionary: 'anim@scripted@payphone_hits@male@',
    introAnim: 'fxfr_phl_1_intro_male',
    exitAnim: 'exit_left_male',
};

export const HANDSET_PROP_ANIM_NAME = 'fxfr_pcn_1_intro_phone';
export const HANDSET_INTRO_ANIM_FLAGS = 14;
export const HANDSET_EXIT_ANIM_FLAGS = 1;
export const HANDSET_PLAYER_OFFSET: Vector3 = [-0.1, -0.85, 0.0];

export const VANILLA_PHONE_BOOTH_MODELS = ['prop_phonebox_01a', 'prop_phonebox_01b', 'prop_phonebox_01c'];
export const VANILLA_PHONE_BOOTH_SEARCH_RADIUS = 5.0;

export const RING_HEAR_RADIUS = 15.0;