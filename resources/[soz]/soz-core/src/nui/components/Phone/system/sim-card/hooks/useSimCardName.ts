import { useAtomValue } from 'jotai';

import { simCardNameAtom } from '../sim.card.atom';

export const useSimCardName = () => {
    const name = useAtomValue(simCardNameAtom);

    return {
        name,
    };
};
