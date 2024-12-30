export const RefreshProcessSurfaceCalculation = 150; //ms -- RefreshProcessSurfaceCalculation must be between 100 and 500ms
export const RefreshHandleLossVehControl = 40; //ms
export const RefreshCalcTractionWithUpgrade = 150; //ms

export const GeneralControleDifficulty = 1.5;
export const GeneralSinkageSpeed = 2;
export const GeneralTractionLoss = 1.5;
export const GeneralTractionSpeedLoss = 1;

export const SuspensionRefresh = true;

export const AwdRatingBonus = 25;

export const ResetVehicleTireColiderSideStep = 0.075;

export const sinkDepthStateKey = 'offroad_sink_depth_';
export const WheelColliderSizeStateKey = 'offroad_wheel_collider_';
export const WheelSizeStateKey = 'offroad_wheelsize_';

export const RoadSideHandling = {
    enable: true,
    distanceThreshold: 10,
    depthMultiplier: 0.5,
    tractionMultiplier: 0.75,
};

export const VehicleZoneDefinition: Record<string, string> = {
    MOVIE: 'city',
    ROCKF: 'city',
    DOWNT: 'city',
    DTVINE: 'city',
    EAST_V: 'city',
    GOLF: 'city',
    LEGSQU: 'city',
    MORN: 'city',
    STAD: 'city',
    DAVIS: 'city',
    RANCHO: 'city',
    STRAW: 'city',
    CHAMH: 'city',
    PBOX: 'city',
    SKID: 'city',
    TEXTI: 'city',
    LMESA: 'city',
    ELYSIAN: 'city',
    TERMINA: 'city',
    HAWICK: 'city',
    ALTA: 'city',
    BURTON: 'city',
    DELPE: 'city',
    BEACH: 'city_beaches',
    DELBE: 'city_beaches',
    MTCHIL: 'mountains',
    MTGORDO: 'mountains',
    MTJOSE: 'mountains',
    PALHIGH: 'mountains',
    LAGO: 'zancudo_swamp',
    ZANCUDO: 'zancudo_swamp',
    PALETO: 'popular',
    HARMO: 'popular',
    GRAPES: 'popular',
    SANDY: 'popular',
    RTRAK: 'popular',
    ZQ_UAR: 'popular',
    HUMLAB: 'popular',
};

// name: Name of the zone - only for debugging,
// depthMultiplier: Affect the sinkage speed in the surface in some map zone - Avoid to get into the mood in town (for example) - 1.0 neutral - >1.0 sink faster - <1.0 sink slower
// tractionMultiplier: Affect the traction on the surface in some map zone - 1.0 neutral - >1.0 increase traction effect (speed and control loss) - <1.0 decrease traction effect
export const VehicleZoneModifier = {
    city: {
        name: 'City',
        depthMultiplier: 0.3,
        tractionMultiplier: 0.6,
    },
    city_beaches: {
        name: 'City beaches',
        depthMultiplier: 0.75,
        tractionMultiplier: 0.75,
    },
    mountains: {
        name: 'Mountains',
        depthMultiplier: 1.25,
        tractionMultiplier: 1.1,
    },
    zancudo_swamp: {
        name: 'Zancudo Swamp',
        depthMultiplier: 1.1,
        tractionMultiplier: 1.1,
    },
    popular: {
        name: 'Popular',
        depthMultiplier: 0.75,
        tractionMultiplier: 0.75,
    },
};

// key are coords and radius;
export const zoneBlaclist = [];

export const UnknowVehicleSurfaceData = {
    name: 'Unknow',
    traction: 100,
    depth: 0,
    softness: 0,
};

// name: Name of the surface - only for debugging,
// traction: Base traction on the surface,
// depth: Max possible depth of the surface,
// softness: Base softness of the surface,
export const VehicleSurfaceData = {
    // HARD TERRAIN
    1: {
        name: 'Concrete',
        traction: 100,
        depth: 0,
        softness: 0,
    },
    3: {
        name: 'Sandy concrete',
        traction: 95,
        depth: 0,
        softness: 0,
    },
    4: {
        name: 'Road',
        traction: 100,
        depth: 0,
        softness: 0,
    },
    5: {
        name: 'Painted Road',
        traction: 100,
        depth: 0,
        softness: 0,
    },
    6: {
        name: 'Sandy roadside',
        traction: 80,
        depth: 50,
        softness: 10,
    },
    7: {
        name: 'Rumble Strip',
        traction: 90,
        depth: 0,
        softness: 0,
    },
    9: {
        name: 'Sandstone',
        traction: 80,
        depth: 0,
        softness: 0,
    },
    10: {
        name: 'Rock',
        traction: 80,
        depth: 0,
        softness: 0,
    },
    11: {
        name: 'Rock',
        traction: 80,
        depth: 0,
        softness: 0,
    },
    12: {
        name: 'Cobble',
        traction: 90,
        depth: 0,
        softness: 0,
    },
    13: {
        name: 'Brick',
        traction: 90,
        depth: 0,
        softness: 0,
    },
    16: {
        name: 'Limestoneesque sand',
        traction: 80,
        depth: 0,
        softness: 0,
    },
    17: {
        name: 'Rocky dry dirt',
        traction: 80,
        depth: 50,
        softness: 5,
    },
    // LOOSE TERRAIN
    18: {
        name: 'Dry sand',
        traction: 80,
        depth: 130,
        softness: 40,
    },
    19: {
        name: 'Compact sand',
        traction: 90,
        depth: 30,
        softness: 10,
    },
    20: {
        name: 'Wet Sand',
        traction: 80,
        depth: 100,
        softness: 15,
    },
    21: {
        name: 'Gravely sand',
        traction: 70,
        depth: 220,
        softness: 30,
    },
    22: {
        name: 'Wet hard sand',
        traction: 70,
        depth: 250,
        softness: 50,
    },
    23: {
        name: 'Deep dry sand',
        traction: 75,
        depth: 50,
        softness: 10,
    },
    24: {
        name: 'Deep wet sand',
        traction: 60,
        depth: 350,
        softness: 70,
    },
    31: {
        name: 'Gravely dirt/path',
        traction: 70,
        depth: 50,
        softness: 10,
    },
    32: {
        name: 'Gravel',
        traction: 70,
        depth: 200,
        softness: 15,
    },
    33: {
        name: 'Gravel deep',
        traction: 65,
        depth: 250,
        softness: 15,
    },
    34: {
        name: 'Gravel train track',
        traction: 70,
        depth: 0,
        softness: 0,
    },
    35: {
        name: 'Tuff Sand',
        traction: 90,
        depth: 50,
        softness: 10,
    },
    36: {
        name: 'Dirt',
        traction: 70,
        depth: 300,
        softness: 40,
    },
    37: {
        name: 'Deep road sand',
        traction: 60,
        depth: 75,
        softness: 15,
    },
    38: {
        name: 'Rocky sand',
        traction: 70,
        depth: 150,
        softness: 10,
    },
    39: {
        name: 'Rocky sand underwater',
        traction: 70,
        depth: 200,
        softness: 15,
    },
    40: {
        name: 'Moist dirt path',
        traction: 60,
        depth: 150,
        softness: 50,
    },
    41: {
        name: 'Swamp grass',
        traction: 50,
        depth: 250,
        softness: 50,
    },
    42: {
        name: 'Swamp sand',
        traction: 70,
        depth: 500,
        softness: 110,
    },
    43: {
        name: 'Hard Sand',
        traction: 75,
        depth: 50,
        softness: 10,
    },
    44: {
        name: 'Dirt/Sand hard',
        traction: 50,
        depth: 200,
        softness: 15,
    },
    45: {
        name: 'Dirt/Sand soft',
        traction: 50,
        depth: 200,
        softness: 25,
    },
    // VEGETATION
    46: {
        name: 'Hard grass',
        traction: 80,
        depth: 50,
        softness: 10,
    },
    47: {
        name: 'Grass',
        traction: 65,
        depth: 125,
        softness: 10,
    },
    48: {
        name: 'Tall grass',
        traction: 60,
        depth: 150,
        softness: 20,
    },
    49: {
        name: 'Farmland',
        traction: 60,
        depth: 200,
        softness: 35,
    },
    50: {
        name: 'Podzol',
        traction: 70,
        depth: 125,
        softness: 25,
    },
    51: {
        name: 'Podzol',
        traction: 70,
        depth: 125,
        softness: 25,
    },
    52: {
        name: 'Dry podzol',
        traction: 80,
        depth: 75,
        softness: 10,
    },
    64: {
        name: 'Metal',
        traction: 90,
        depth: 0,
        softness: 0,
    },
    125: {
        name: 'Drain concrete',
        traction: 70,
        depth: 0,
        softness: 0,
    },
};

export const UnknowVehWheelType = {
    rating: 0,
    tractionOnSoft: 0,
    tractionOnHard: 0,
    sinkageSpeed: 1,
    driftThreshold: 1.3,
};

// upgradeRating: Effect of the wheel ability to get out of mood. 0 neutral - Negative more difficult - Positive easier
// tractionOnSoft: Additional traction effect on soft surface. 0 neutral - Negative more difficult - Positive easier
// tractionOnHard: Additional traction effect on soft surface. 0 neutral - Negative more difficult - Positive easier
// sinkageSpeed: Affect the sinkage speed of the vehicle in the surface (multiplier). 100 neutral - <100 more difficult - >100 easier
// driftThreshold: Affect if ability of the vehicule to drift on control loss - 1.3 neutral - <1.3 more drift - >1.3 less drift
export const VehWheelTypeData = {
    [-1]: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    0: {
        rating: -20,
        tractionOnSoft: -15,
        tractionOnHard: 0,
        sinkageSpeed: 1.25,
        driftThreshold: 1.1,
    },
    1: {
        rating: 25,
        tractionOnSoft: 10,
        tractionOnHard: 0,
        sinkageSpeed: 0.9,
        driftThreshold: 1.4,
    },
    2: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    3: {
        rating: 25,
        tractionOnSoft: 10,
        tractionOnHard: 0,
        sinkageSpeed: 0.9,
        driftThreshold: 1.4,
    },
    4: {
        rating: 50,
        tractionOnSoft: 20,
        tractionOnHard: -10,
        sinkageSpeed: 0.7,
        driftThreshold: 1.7,
    },
    5: {
        rating: -20,
        tractionOnSoft: -15,
        tractionOnHard: 0,
        sinkageSpeed: 1.25,
        driftThreshold: 1.1,
    },
    6: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    7: {
        rating: -20,
        tractionOnSoft: -15,
        tractionOnHard: 0,
        sinkageSpeed: 1.25,
        driftThreshold: 1.1,
    },
    8: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    9: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    10: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    11: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
    12: {
        rating: 0,
        tractionOnSoft: 0,
        tractionOnHard: 0,
        sinkageSpeed: 1,
        driftThreshold: 1.3,
    },
};

export const VehBacklist = {
    models: [],
    classes: {
        0: false, // Compacts
        1: false, // Sedans
        2: false, // SUVs
        3: false, // Coupes
        4: false, // Muscle
        5: false, // Sports Classics
        6: false, // Sports
        7: false, // Super
        8: false, // Motorcycles
        9: false, // Off-road
        10: false, // Industrial
        11: false, // Utility
        12: false, // Vans
        17: false, // Service
        18: false, // Emergency
        19: false, // Military
        20: false, // Commercial
    },
};
export const UnknownVehData = {
    rating: 0,
    tractionOnSoft: 100,
    tractionOnHard: 100,
};

// rating: Effect of the wheel ability to get out of mood. 0 neutral - Negative more difficult - Positive easier
// tractionSpeedLostOnSoft: Affect the max speed of the vehicle on soft surface. 100 neutral - <100 lower max speed - >100 do nothing
// tractionSpeedLostOnHard: Affect the max speed of the vehicle on hard surface. 100 neutral - <100 lower max speed - >100 do nothing
export const VehData = {
    models: {
        seminole2: {
            rating: 20,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        sandking: {
            rating: 20,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        sandking2: {
            rating: 20,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        issi2: {
            rating: -10,
            tractionSpeedLostOnSoft: 95,
            tractionSpeedLostOnHard: 100,
        },
        panto: {
            rating: -20,
            tractionSpeedLostOnSoft: 85,
            tractionSpeedLostOnHard: 100,
        },
        comet4: {
            rating: 30,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },

        // Bicycle
        bmx: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        inductor: {
            rating: 80,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        scorcher: {
            rating: 80,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },

        // dirt bikes
        avarus: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        bcso30: {
            rating: 70,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        bf400: {
            rating: 70,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        blazer: {
            rating: 65,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        blazer2: {
            rating: 65,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        blazer3: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        blazer4: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        blazer5: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        cliffhanger: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        deamon: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        deamon2: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        enduro: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        esskey: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        gargoyle: {
            rating: 70,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        hexer: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        innovation: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        manchez: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        manchez3: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        manchez2: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        nemesis: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        nightblade: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        pcj: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        powersurge: {
            rating: 40,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        ratbike: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        rrocket: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        sanchez: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        sanchez2: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        sanctus: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        sovereign: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        stryder: {
            rating: 60,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        vader: {
            rating: 70,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        verus: {
            rating: 70,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        wolfsbane: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        zombiea: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
        zombie2: {
            rating: 50,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        },
    },
    classes: {
        0: {
            rating: 5,
            tractionSpeedLostOnSoft: 95,
            tractionSpeedLostOnHard: 100,
        }, // Compacts
        1: {
            rating: -5,
            tractionSpeedLostOnSoft: 90,
            tractionSpeedLostOnHard: 100,
        }, // Sedans
        2: {
            rating: 15,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // SUVs
        3: {
            rating: 0,
            tractionSpeedLostOnSoft: 90,
            tractionSpeedLostOnHard: 100,
        }, // Coupes
        4: {
            rating: -5,
            tractionSpeedLostOnSoft: 90,
            tractionSpeedLostOnHard: 100,
        }, // Muscle
        5: {
            rating: 5,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Sports Classics
        6: {
            rating: 5,
            tractionSpeedLostOnSoft: 75,
            tractionSpeedLostOnHard: 100,
        }, // Sports
        7: {
            rating: 5,
            tractionSpeedLostOnSoft: 75,
            tractionSpeedLostOnHard: 100,
        }, // Super
        8: {
            rating: -10,
            tractionSpeedLostOnSoft: 85,
            tractionSpeedLostOnHard: 100,
        }, // Motorcycles
        9: {
            rating: 35,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Off-road
        10: {
            rating: -10,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Industrial
        11: {
            rating: -10,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Utility
        12: {
            rating: -5,
            tractionSpeedLostOnSoft: 90,
            tractionSpeedLostOnHard: 100,
        }, // Vans
        17: {
            rating: 10,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Service
        18: {
            rating: 10,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Emergency
        19: {
            rating: 15,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Military
        20: {
            rating: -5,
            tractionSpeedLostOnSoft: 100,
            tractionSpeedLostOnHard: 100,
        }, // Commercial
    },
};
