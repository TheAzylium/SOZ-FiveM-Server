import clsx from 'clsx';
import React, { FunctionComponent } from 'react';

import { formatClock } from '../../../../../../shared/phone/apps/zchecs';

interface ZchecsClockProps {
    timeMs: number | null;
    /** true quand c'est cette pendule qui décompte. */
    running: boolean;
}

/**
 * Une pendule ne se met jamais en pause: le temps s'écoule en continu côté
 * serveur. Seule la mise en évidence distingue le camp au trait.
 */
export const ZchecsClock: FunctionComponent<ZchecsClockProps> = ({ timeMs, running }) => {
    if (timeMs === null || timeMs === undefined) {
        return null;
    }

    const low = timeMs <= 30_000;

    return (
        <span
            className={clsx('rounded-md px-2 py-0.5 font-mono text-sm tabular-nums', {
                'bg-white text-black font-semibold': running && !low,
                'bg-red-600 text-white font-semibold': running && low,
                'bg-black/40 text-gray-400': !running,
            })}
        >
            {formatClock(timeMs)}
        </span>
    );
};
