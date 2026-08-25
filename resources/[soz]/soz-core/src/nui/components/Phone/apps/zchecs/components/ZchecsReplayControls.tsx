import clsx from 'clsx';
import React, { FunctionComponent } from 'react';

import { useThemeConfig } from '../../../system/config/config.atom';

interface ZchecsReplayControlsProps {
    /** Demi-coup consulté (0-indexé), -1 = position de départ. */
    ply: number;
    total: number;
    playing: boolean;
    onSeek: (ply: number) => void;
    onTogglePlay: () => void;
}

export const ZchecsReplayControls: FunctionComponent<ZchecsReplayControlsProps> = ({
    ply,
    total,
    playing,
    onSeek,
    onTogglePlay,
}) => {
    if (total === 0) {
        return null;
    }

    const atStart = ply < 0;
    const atEnd = ply >= total - 1;

    return (
        <div className="flex items-center justify-center gap-1.5 mb-3">
            <ControlButton label="Début" disabled={atStart} onClick={() => onSeek(-1)}>
                ⏮
            </ControlButton>
            <ControlButton label="Précédent" disabled={atStart} onClick={() => onSeek(ply - 1)}>
                ◀
            </ControlButton>
            <ControlButton label={playing ? 'Pause' : 'Lecture'} disabled={atEnd} onClick={onTogglePlay} wide>
                {playing ? '⏸' : '▶'}
            </ControlButton>
            <ControlButton label="Suivant" disabled={atEnd} onClick={() => onSeek(ply + 1)}>
                ▶
            </ControlButton>
            <ControlButton label="Fin" disabled={atEnd} onClick={() => onSeek(total - 1)}>
                ⏭
            </ControlButton>
        </div>
    );
};

const ControlButton: FunctionComponent<
    React.PropsWithChildren<{ label: string; disabled: boolean; wide?: boolean; onClick: () => void }>
> = ({ label, disabled, wide, onClick, children }) => {
    const theme = useThemeConfig();

    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className={clsx('rounded-lg py-1.5 text-sm', wide ? 'px-5' : 'px-3', {
                'bg-ios-700 text-white': theme === 'dark',
                'bg-white text-black shadow': theme === 'light',
                'opacity-40 cursor-not-allowed': disabled,
            })}
        >
            {children}
        </button>
    );
};
