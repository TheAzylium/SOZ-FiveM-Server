import { FunctionComponent, useState } from 'react';
import { useSelector } from 'react-redux';

import { NuiEvent } from '../../../shared/event';
import { MenuType } from '../../../shared/nui/menu';
import { TrainingWatchLoadout, TrainingWatchMenuData } from '../../../shared/weapons/weapon';
import { fetchNui } from '../../fetch';
import { usePlayer } from '../../hook/data';
import { RootState } from '../../store';
import {
    MainMenu,
    Menu,
    MenuContent,
    MenuItemButton,
    MenuItemCheckbox,
    MenuItemSelect,
    MenuItemSelectOption,
    MenuItemText,
    MenuSubTitle,
    MenuTitle,
} from '../Styleguide/Menu';

type MenuTacticalWatchProps = {
    data: TrainingWatchMenuData;
};

export const MenuTacticalWatch: FunctionComponent<MenuTacticalWatchProps> = ({ data }) => {
    const player = usePlayer();
    const [loadout, setLoadout] = useState<TrainingWatchLoadout>(data.loadout);
    // Kept live by TrainingWatchProvider (client) on every TACTICAL_WATCH_SYNC — hits taken,
    // loadout changes, reset, get-up — so this reflects the current state, not just what it was
    // when the menu was opened.
    const snapshot = useSelector((state: RootState) => state.playerStats.trainingWatch) ?? data.snapshot;

    if (!player) {
        return null;
    }

    const updateLoadout = async (next: TrainingWatchLoadout) => {
        setLoadout(next);
        await fetchNui(NuiEvent.TacticalWatchSetLoadout, next);
    };

    return (
        <Menu type={MenuType.TacticalWatchMenu}>
            <MainMenu>
                <MenuTitle title="Montre tactique" />
                <MenuContent>
                    <MenuSubTitle>État virtuel</MenuSubTitle>
                    <MenuItemText>
                        {`Vie ${snapshot.health}/${snapshot.maxHealth} — Armure ${snapshot.armor}/${snapshot.maxArmor} — Plaques ${snapshot.plates}/${snapshot.maxPlates}`}
                    </MenuItemText>

                    <MenuSubTitle>Réglages</MenuSubTitle>
                    <MenuItemCheckbox
                        checked={loadout.armor === 100}
                        description="Simule le port d'un gilet pare-balles complet, sans avoir besoin du vrai gilet"
                        onChange={checked => updateLoadout({ ...loadout, armor: checked ? 100 : 0 })}
                    >
                        Gilet pare-balles
                    </MenuItemCheckbox>
                    <MenuItemSelect
                        title="Plaques"
                        value={loadout.plates}
                        description="Nombre de plaques virtuelles, sans avoir besoin des vraies plaques"
                        onConfirm={async (_, value) => {
                            await updateLoadout({ ...loadout, plates: value });
                        }}
                    >
                        {[0, 1, 2, 3, 4, 5, 6].map(count => (
                            <MenuItemSelectOption key={count} value={count}>
                                {count}
                            </MenuItemSelectOption>
                        ))}
                    </MenuItemSelect>

                    <MenuSubTitle>Actions</MenuSubTitle>
                    <MenuItemButton
                        description="Se relever immédiatement du ragdoll d'entraînement"
                        onConfirm={() => fetchNui(NuiEvent.TacticalWatchGetUp)}
                    >
                        Se relever
                    </MenuItemButton>
                    <MenuItemButton
                        description="Remet la vie virtuelle au maximum et l'armure/plaques au dernier réglage choisi"
                        onConfirm={() => fetchNui(NuiEvent.TacticalWatchReset)}
                    >
                        Réinitialiser (vie / armure / plaques)
                    </MenuItemButton>
                </MenuContent>
            </MainMenu>
        </Menu>
    );
};
