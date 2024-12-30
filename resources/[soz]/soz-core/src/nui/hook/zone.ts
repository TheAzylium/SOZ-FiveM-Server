import { AbstractZone } from '../../shared/polyzone/abstract.zone';
import { usePlayerPosition } from './data';

export const useIsInZone = (zone: AbstractZone) => {
    const position = usePlayerPosition();

    return zone.isPointInside(position);
};
