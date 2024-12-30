import { Vector3 } from '@public/shared/polyzone/vector';
import { createModel } from '@rematch/core';

import { PlayerData } from '../../shared/player';
import type { RootModel } from './';

export const player = createModel<RootModel>()({
    state: null as PlayerData | null,
    reducers: {
        update(state, player: Partial<PlayerData>) {
            return { ...state, ...player };
        },
    },
    effects: () => ({}),
});

export const playerStats = createModel<RootModel>()({
    state: [200, 100] as [number, number],
    reducers: {
        update(state, health: [number, number]) {
            return health;
        },
    },
    effects: () => ({}),
});

export const playerPosition = createModel<RootModel>()({
    state: [0, 0, 0] as Vector3,
    reducers: {
        update(state, position: Vector3) {
            return position;
        },
    },
    effects: () => ({}),
});
