import { FunctionComponent } from 'react';

import { NuiEvent } from '../../../shared/event';
import { fetchNui } from '../../fetch';
import {
    MenuContent,
    MenuItemCheckbox,
    MenuItemSelect,
    MenuItemSelectOption,
    MenuTitle,
    SubMenu,
} from '../Styleguide/Menu';

export type InteractiveSubMenuProps = {
    banner: string;
    state: {
        displayOwners: boolean;
        displayDebugSurface: boolean;
        displayPlayerNames: boolean;
        displayPlayersOnMap: boolean;
    };
};

export const InteractiveSubMenu: FunctionComponent<InteractiveSubMenuProps> = ({ banner, state }) => {
    return (
        <SubMenu id="interactive">
            <MenuTitle banner={banner}>Des options à la carte</MenuTitle>
            <MenuContent>
                <MenuItemCheckbox
                    checked={state.displayOwners}
                    onChange={async value => {
                        await fetchNui(NuiEvent.AdminToggleDisplayOwners, value);
                    }}
                >
                    Afficher les propriétaires de véhicules
                </MenuItemCheckbox>
                <MenuItemCheckbox
                    checked={state.displayDebugSurface}
                    onChange={async value => {
                        await fetchNui(NuiEvent.AdminToggleDisplaySurfaceDebug, value);
                    }}
                >
                    Afficher les propriétés de surface
                </MenuItemCheckbox>
                <MenuItemSelect
                    title={'Afficher les noms des joueurs'}
                    onConfirm={async value => {
                        await fetchNui(NuiEvent.AdminToggleDisplayPlayerNames, {
                            value: !state.displayPlayerNames,
                            withDetails: value === 1,
                        });
                        state.displayPlayerNames = !state.displayPlayerNames;
                    }}
                >
                    <MenuItemSelectOption>Sans détails</MenuItemSelectOption>
                    <MenuItemSelectOption>Avec détails</MenuItemSelectOption>
                </MenuItemSelect>
                <MenuItemCheckbox
                    checked={state.displayPlayersOnMap}
                    onChange={async value => {
                        await fetchNui(NuiEvent.AdminToggleDisplayPlayersOnMap, value);
                    }}
                >
                    Afficher les joueurs sur la carte
                </MenuItemCheckbox>
            </MenuContent>
        </SubMenu>
    );
};
