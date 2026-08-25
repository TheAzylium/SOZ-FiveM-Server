import clsx from 'clsx';
import React, { FunctionComponent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
    ZCHECS_TIME_CONTROLS,
    ZCHECS_VARIANT_LABELS,
    ZchecsGame,
    zchecsIsUrgent,
} from '../../../../../../shared/phone/apps/zchecs';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useContact } from '../../../system/sim-card/hooks/useContact';
import {
    didIWin,
    eloDeltaLabel,
    frenchSan,
    gameStatusLabel,
    relativeTime,
    remainingTime,
} from '../zchecs.labels';

interface ZchecsGameRowProps {
    game: ZchecsGame;
    onAccept?: (id: number) => void;
    onDecline?: (id: number) => void;
}

export const ZchecsGameRow: FunctionComponent<ZchecsGameRowProps> = ({ game, onAccept, onDecline }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useThemeConfig();
    const contact = useContact(game.opponentNumber);

    // Pseudo ZChecs d'abord, puis le repertoire, puis le numero brut.
    const name = game.opponentName || contact?.display || game.opponentNumber;
    const delta = eloDeltaLabel(game.myEloDelta);
    const isInvitation = Boolean(onAccept && onDecline);
    const urgent = zchecsIsUrgent(game);

    return (
        <div
            className={clsx('w-full rounded-xl shadow mb-2 px-3 py-2.5', {
                'bg-ios-700 text-white': theme === 'dark',
                'bg-white text-black': theme === 'light',
                'ring-1 ring-red-500/70': urgent,
            })}
        >
            <button
                type="button"
                className="w-full flex items-center gap-3 text-left"
                onClick={() => navigate(`/zchecs/game/${game.id}`)}
            >
                <span
                    className={clsx(
                        'flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold shrink-0 border',
                        {
                            'bg-[#F5F0E6] text-[#1B1714] border-[#8A8073]': game.myColor === 'w',
                            'bg-[#2B2723] text-[#F5F0E6] border-[#0D0B0A]': game.myColor === 'b',
                        }
                    )}
                >
                    {game.myColor === 'w' ? 'B' : 'N'}
                </span>

                <span className="flex flex-col min-w-0 grow">
                    <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{name}</span>
                        <span
                            className={clsx('shrink-0 text-[10px] px-1.5 py-0.5 rounded-full', {
                                'bg-[#347DD9] text-white': game.ranked,
                                'bg-gray-500/40': !game.ranked,
                            })}
                        >
                            {t(game.ranked ? 'ZCHECS.RANKED' : 'ZCHECS.CASUAL')}
                        </span>
                        {game.variant !== 'STANDARD' && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-purple-600 text-white">
                                {ZCHECS_VARIANT_LABELS[game.variant]}
                            </span>
                        )}
                        {game.timeControl !== 'CORRESPONDENCE' && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-600 text-white">
                                {ZCHECS_TIME_CONTROLS[game.timeControl].label}
                            </span>
                        )}
                        {urgent && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                                {t('ZCHECS.URGENT')}
                            </span>
                        )}
                    </span>

                    <span
                        className={clsx('text-xs truncate', {
                            'text-[#347DD9]': game.status === 'ACTIVE' && game.isMyTurn && !urgent,
                            'text-red-400': urgent,
                            'text-gray-400': !(game.status === 'ACTIVE' && game.isMyTurn),
                        })}
                    >
                        {gameStatusLabel(t, game)}
                        {game.lastMove ? ` · ${frenchSan(game.lastMove.san)}` : ''}
                    </span>
                </span>

                <span className="flex flex-col items-end shrink-0 text-xs">
                    {delta && (
                        <span
                            className={clsx('font-semibold', {
                                'text-green-400': game.myEloDelta > 0,
                                'text-red-400': game.myEloDelta < 0,
                                'text-gray-400': game.myEloDelta === 0,
                            })}
                        >
                            {delta}
                        </span>
                    )}
                    {game.status === 'FINISHED' && !delta && (
                        <span className="text-gray-400">{game.result === null ? '—' : didIWin(game) ? 'V' : 'D'}</span>
                    )}
                    <span className={clsx(urgent ? 'text-red-400' : 'text-gray-500')}>
                        {urgent && game.deadlineAt ? remainingTime(game.deadlineAt) : relativeTime(game.lastMoveAt)}
                    </span>
                </span>
            </button>

            {isInvitation && (
                <div className="flex gap-2 mt-2.5">
                    <button
                        type="button"
                        className="grow rounded-lg bg-[#347DD9] text-white text-sm py-1.5"
                        onClick={() => onAccept(game.id)}
                    >
                        {t('ZCHECS.ACCEPT')}
                    </button>
                    <button
                        type="button"
                        className="grow rounded-lg bg-gray-500/40 text-sm py-1.5"
                        onClick={() => onDecline(game.id)}
                    >
                        {t('ZCHECS.DECLINE')}
                    </button>
                </div>
            )}
        </div>
    );
};
