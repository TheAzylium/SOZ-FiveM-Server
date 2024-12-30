import { fetchNui } from '@public/nui/fetch';
import { NuiEvent } from '@public/shared/event';
import { PoliceJobFineMenuData } from '@public/shared/job/police';
import { MenuType } from '@public/shared/nui/menu';
import { FunctionComponent } from 'react';

import { RepositoryType } from '../../../shared/repository';
import { useRepository } from '../../hook/repository';
import {
    MainMenu,
    Menu,
    MenuContent,
    MenuItemButton,
    MenuItemSubMenuLink,
    MenuTitle,
    SubMenu,
} from '../Styleguide/Menu';

type FinesStateProps = {
    data: PoliceJobFineMenuData;
};

export const FinesMenu: FunctionComponent<FinesStateProps> = ({ data }) => {
    const banner = `https://nui-img/soz/menu_job_${data.job}`;
    return (
        <Menu type={MenuType.PoliceJobFines}>
            <MainMenu>
                <MenuTitle banner={banner}>L'ordre et la justice !</MenuTitle>
                <MenuContent>
                    <MenuItemButton
                        onConfirm={async () => {
                            await fetchNui(NuiEvent.PolicePreCustomFine, {
                                playerServerId: data.playerServerId,
                            });
                        }}
                    >
                        Amende personnalisée
                    </MenuItemButton>
                    <MenuItemSubMenuLink id="fine_1">Catégorie 1</MenuItemSubMenuLink>
                    <MenuItemSubMenuLink id="fine_2">Catégorie 2</MenuItemSubMenuLink>
                    <MenuItemSubMenuLink id="fine_3">Catégorie 3</MenuItemSubMenuLink>
                    <MenuItemSubMenuLink id="fine_4">Catégorie 4</MenuItemSubMenuLink>
                </MenuContent>
            </MainMenu>
            <FineSubMenu category={1} playerServerId={data.playerServerId} />
            <FineSubMenu category={2} playerServerId={data.playerServerId} />
            <FineSubMenu category={3} playerServerId={data.playerServerId} />
            <FineSubMenu category={4} playerServerId={data.playerServerId} />
        </Menu>
    );
};

type FineSubMenuProps = {
    category: number;
    playerServerId: number;
};

const FineSubMenu: FunctionComponent<FineSubMenuProps> = ({ category, playerServerId }) => {
    const fines = useRepository(RepositoryType.Fine);
    const finesForCategory = Object.values(fines).filter(fine => fine.category === category);

    return (
        <SubMenu id={`fine_${category}`}>
            <MenuTitle banner="https://nui-img/soz/menu_job_gouv">Amendes catégorie {category}</MenuTitle>
            <MenuContent>
                {finesForCategory.map(fine => (
                    <MenuItemButton
                        onConfirm={async () => {
                            await fetchNui(NuiEvent.PolicePreFine, {
                                playerServerId,
                                fine: fine,
                            });
                        }}
                    >
                        <div className="flex justify-between">
                            <div>{fine.label}</div>
                            <div>
                                ${fine.price.min} - ${fine.price.max}
                            </div>
                        </div>
                    </MenuItemButton>
                ))}
            </MenuContent>
        </SubMenu>
    );
};
