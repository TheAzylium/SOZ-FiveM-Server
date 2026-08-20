import React, { FunctionComponent } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppContainer } from '../../components/system/AppContainer';
import { ZchecsGamePage } from './pages/ZchecsGamePage';
import { ZchecsHome } from './pages/ZchecsHome';
import { ZchecsLeaderboard } from './pages/ZchecsLeaderboard';
import { ZchecsNewGame } from './pages/ZchecsNewGame';

export const ZchecsApp: FunctionComponent = () => {
    return (
        <AppContainer>
            <Routes>
                <Route index element={<ZchecsHome />} />
                <Route path="new" element={<ZchecsNewGame />} />
                <Route path="game/:id" element={<ZchecsGamePage />} />
                <Route path="leaderboard" element={<ZchecsLeaderboard />} />
            </Routes>
        </AppContainer>
    );
};
