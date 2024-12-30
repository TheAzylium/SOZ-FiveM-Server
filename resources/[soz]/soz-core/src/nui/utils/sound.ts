import { NuiEvent } from '../../shared/event/nui';
import { fetchNui } from '../fetch';

export const playSound = (name: string, volume: number) => {
    fetchNui(NuiEvent.PlaySound, { name, volume });
};
