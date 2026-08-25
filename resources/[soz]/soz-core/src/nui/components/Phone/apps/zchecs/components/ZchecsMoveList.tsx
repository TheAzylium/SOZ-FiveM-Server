import clsx from 'clsx';
import React, { FunctionComponent, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { useThemeConfig } from '../../../system/config/config.atom';
import { frenchSan } from '../zchecs.labels';

interface Turn {
    number: number;
    white?: string;
    black?: string;
}

interface ZchecsMoveListProps {
    /** SAN anglais tel que produit par chess.js: francisé seulement à l'affichage. */
    moves: string[];
    /** Demi-coup actuellement consulté; par défaut le dernier joué. */
    selectedPly: number;
    onSelectPly: (ply: number) => void;
}

export const ZchecsMoveList: FunctionComponent<ZchecsMoveListProps> = ({ moves, selectedPly, onSelectPly }) => {
    const { t } = useTranslation();
    const theme = useThemeConfig();
    const scroller = useRef<HTMLDivElement>(null);
    const selectedRow = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Garde le coup consulté visible sans avoir à scroller à la main.
        selectedRow.current?.scrollIntoView({ block: 'nearest' });
    }, [selectedPly, moves.length]);

    const turns: Turn[] = [];

    for (let i = 0; i < moves.length; i += 2) {
        turns.push({ number: i / 2 + 1, white: moves[i], black: moves[i + 1] });
    }

    const selectedTurn = Math.floor(selectedPly / 2);

    return (
        <div
            className={clsx('rounded-xl overflow-hidden mb-3', {
                'bg-ios-700 text-white': theme === 'dark',
                'bg-white text-black': theme === 'light',
            })}
        >
            <p className="text-[10px] uppercase tracking-wide text-gray-500 px-3 pt-2 pb-1">{t('ZCHECS.MOVES')}</p>

            {turns.length === 0 ? (
                <p className="text-xs text-gray-500 px-3 pb-3">{t('ZCHECS.NO_MOVES')}</p>
            ) : (
                <>
                    <div
                        ref={scroller}
                        className={clsx(
                            'h-[140px] overflow-y-auto',
                            'scrollbar scrollbar-w-[5px] scrollbar-thumb-rounded-full scrollbar-track-rounded-full',
                            {
                                'scrollbar-thumb-white/80': theme === 'dark',
                                'scrollbar-thumb-black/20': theme === 'light',
                            }
                        )}
                    >
                        {turns.map((turn, index) => (
                            <div
                                key={turn.number}
                                ref={index === selectedTurn ? selectedRow : undefined}
                                className={clsx('grid grid-cols-[2.2rem_1fr_1fr] items-center text-base font-mono', {
                                    'bg-black/10': theme === 'light' && index % 2 === 1,
                                    'bg-white/5': theme === 'dark' && index % 2 === 1,
                                })}
                            >
                                <span className="text-gray-500 text-sm px-2 py-1.5">{turn.number}.</span>
                                <MoveCell
                                    san={turn.white}
                                    selected={selectedPly === index * 2}
                                    onClick={() => onSelectPly(index * 2)}
                                />
                                <MoveCell
                                    san={turn.black}
                                    selected={selectedPly === index * 2 + 1}
                                    onClick={() => onSelectPly(index * 2 + 1)}
                                />
                            </div>
                        ))}
                    </div>

                    <p className="text-[10px] leading-snug text-gray-500 px-3 py-2 border-t border-gray-500/20">
                        {t('ZCHECS.NOTATION_LEGEND')}
                    </p>
                </>
            )}
        </div>
    );
};

const MoveCell: FunctionComponent<{ san?: string; selected: boolean; onClick: () => void }> = ({
    san,
    selected,
    onClick,
}) => {
    if (!san) {
        return <span className="px-2 py-1.5" />;
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className={clsx('text-left px-2 py-1.5 rounded', {
                'bg-[#347DD9] text-white font-bold': selected,
            })}
        >
            {frenchSan(san)}
        </button>
    );
};
