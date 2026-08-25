import clsx from 'clsx';
import React, { FunctionComponent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { ZchecsEloPoint } from '../../../../../../shared/phone/apps/zchecs';
import { AppContent } from '../../../components/system/AppContent';
import { AppTitle } from '../../../components/system/AppTitle';
import { AppWrapper } from '../../../components/system/AppWrapper';
import { useAppTitleGetBackUpdater } from '../../../system/apps/hooks/useAppTitleGetBackUpdater';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsHistory, useZchecsProfile } from '../zchecs.atom';
import { relativeTime, signed } from '../zchecs.labels';

export const ZchecsStats: FunctionComponent = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const theme = useThemeConfig();

    const profile = useZchecsProfile();
    const history = useZchecsHistory();
    const { fetchHistory } = useZchecsAPI();

    useAppTitleGetBackUpdater(() => navigate('/zchecs'));

    useEffect(() => {
        fetchHistory();
    }, []);

    const played = profile.wins + profile.losses + profile.draws;
    const winRate = played > 0 ? Math.round((profile.wins / played) * 100) : 0;

    const card = clsx('rounded-xl px-4 py-3 shadow', {
        'bg-ios-700 text-white': theme === 'dark',
        'bg-white text-black': theme === 'light',
    });

    return (
        <AppWrapper scrollable>
            <AppTitle title={t('ZCHECS.STATS')} />
            <AppContent>
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className={clsx(card, 'text-center')}>
                        <p className="text-xl font-semibold">{profile.elo}</p>
                        <p className="text-[10px] text-gray-400">ELO</p>
                    </div>
                    <div className={clsx(card, 'text-center')}>
                        <p className="text-xl font-semibold">{winRate}%</p>
                        <p className="text-[10px] text-gray-400">victoires</p>
                    </div>
                    <div className={clsx(card, 'text-center')}>
                        <p className="text-xl font-semibold">{played}</p>
                        <p className="text-[10px] text-gray-400">parties</p>
                    </div>
                </div>

                <div className={clsx(card, 'mb-3')}>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{t('ZCHECS.ELO_HISTORY')}</p>
                    {history.length < 2 ? (
                        <p className="text-xs text-gray-500">{t('ZCHECS.NO_HISTORY')}</p>
                    ) : (
                        <EloChart points={history} />
                    )}
                </div>

                {[...history].reverse().map((point, index) => (
                    <div key={`${point.at}-${index}`} className={clsx(card, 'mb-2 flex items-center justify-between')}>
                        <span className="flex flex-col min-w-0">
                            <span className="truncate text-sm">{point.opponentName}</span>
                            <span className="text-[11px] text-gray-500">{relativeTime(point.at)}</span>
                        </span>
                        <span className="flex items-center gap-3 shrink-0">
                            <span
                                className={clsx('text-sm font-semibold', {
                                    'text-green-400': point.delta > 0,
                                    'text-red-400': point.delta < 0,
                                    'text-gray-400': point.delta === 0,
                                })}
                            >
                                {signed(point.delta)}
                            </span>
                            <span className="text-sm text-gray-400 w-10 text-right">{point.elo}</span>
                        </span>
                    </div>
                ))}

                <div className="h-24" />
            </AppContent>
        </AppWrapper>
    );
};

/** Courbe ELO en SVG inline, sans dépendance de graphe. */
const EloChart: FunctionComponent<{ points: ZchecsEloPoint[] }> = ({ points }) => {
    const width = 340;
    const height = 90;
    const padding = 6;

    const values = points.map(point => point.elo);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const coords = values.map((value, index) => {
        const x = padding + (index / (values.length - 1)) * (width - padding * 2);
        const y = height - padding - ((value - min) / span) * (height - padding * 2);

        return { x, y };
    });

    const line = coords.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ');
    const area = `${line} L${coords[coords.length - 1].x} ${height} L${coords[0].x} ${height} Z`;
    const last = coords[coords.length - 1];
    const rising = values[values.length - 1] >= values[0];
    const stroke = rising ? '#4ADE80' : '#F87171';

    return (
        <div>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Progression ELO">
                <path d={area} fill={stroke} fillOpacity="0.12" />
                <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
                <circle cx={last.x} cy={last.y} r="3" fill={stroke} />
            </svg>
            <div className="flex justify-between text-[10px] text-gray-500">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
};
