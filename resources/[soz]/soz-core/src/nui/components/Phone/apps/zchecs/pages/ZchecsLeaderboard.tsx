import React, { FunctionComponent, useEffect } from 'react';

import Leaderboard from '../../../components/games/LeaderBoard';
import { useZchecsAPI } from '../hooks/useZchecsAPI';
import { useZchecsLeaderboard } from '../zchecs.atom';

export const ZchecsLeaderboard: FunctionComponent = () => {
    const leaderboard = useZchecsLeaderboard();
    const { fetchLeaderboard } = useZchecsAPI();

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    return <Leaderboard leaderboard={leaderboard} />;
};
