import { FunctionComponent } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AppContainer } from '../../components/system/AppContainer';
import { ContactList } from './pages/ContactList';
import { ContactShow } from './pages/ContactShow';
import { SentMessagesHistory } from './pages/SentMessagesHistory';

export const SocietyContactsApp: FunctionComponent = () => {
    return (
        <AppContainer>
            <Routes>
                <Route index element={<ContactList />} />
                <Route path="history" element={<SentMessagesHistory />} />
                <Route path=":number" element={<ContactShow />} />
            </Routes>
        </AppContainer>
    );
};
