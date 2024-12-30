import { NuiEvent } from '@public/shared/event';
import { PlasterConfigs, PlasterLocation, PlasterMenuData } from '@public/shared/job/lsmc';
import { FunctionComponent } from 'react';

import { MenuType } from '../../../shared/nui/menu';
import { fetchNui } from '../../fetch';
import { MainMenu, Menu, MenuContent, MenuItemButton, MenuTitle } from '../Styleguide/Menu';

type LSMCPlasterMenuProps = {
    data: PlasterMenuData;
};

export const LsmcPlasterMenu: FunctionComponent<LSMCPlasterMenuProps> = ({ data }) => {
    const banner = 'https://nui-img/soz/menu_job_lsmc';

    return (
        <Menu type={MenuType.LsmcPlaster}>
            <MainMenu>
                <MenuTitle banner={banner}>Plâtre</MenuTitle>
                <MenuContent>
                    {Object.values(PlasterLocation).map(loc => {
                        return (
                            <MenuItemButton
                                onConfirm={() => {
                                    fetchNui(NuiEvent.LsmcPlaster, {
                                        location: loc,
                                        playerServerId: data.playerServerId,
                                    });
                                }}
                                key={loc}
                            >
                                {PlasterConfigs[loc].label}
                            </MenuItemButton>
                        );
                    })}
                </MenuContent>
            </MainMenu>
        </Menu>
    );
};
