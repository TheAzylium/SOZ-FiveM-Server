import clsx from 'clsx';
import React, { FunctionComponent, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { ZCHECS_LEADERBOARD_MIN_GAMES } from '../../../../../../shared/phone/apps/zchecs';
import Leaderboard from '../../../components/games/LeaderBoard';
import { useThemeConfig } from '../../../system/config/config.atom';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsLeaderboard, useZchecsProfile } from '../zchecs.atom';

export const ZchecsLeaderboard: FunctionComponent = () => {
    const { t } = useTranslation();
    const theme = useThemeConfig();

    const leaderboard = useZchecsLeaderboard();
    const profile = useZchecsProfile();
    const { fetchLeaderboard } = useZchecsAPI();

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    // Rappel de mon rang: le classement s'arrête au top 100.
    const showMyRank = profile.rank === null || profile.rank > leaderboard.length;

    return (
        <div className="relative flex flex-col grow">
            <Leaderboard leaderboard={leaderboard} />

            {showMyRank && (
                <div
                    className={clsx('absolute bottom-24 inset-x-4 rounded-xl px-4 py-2.5 shadow-lg text-sm', {
                        'bg-ios-700 text-white': theme === 'dark',
                        'bg-white text-black': theme === 'light',
                    })}
                >
                    {profile.rank === null ? (
                        <span className="text-gray-400">
                            {t('ZCHECS.UNRANKED')} — {t('ZCHECS.UNRANKED_HINT', { count: ZCHECS_LEADERBOARD_MIN_GAMES })}
                        </span>
                    ) : (
                        <span className="flex justify-between">
                            <span>{t('ZCHECS.RANK', { rank: profile.rank, total: profile.totalRanked })}</span>
                            <span className="font-semibold">{profile.elo}</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
