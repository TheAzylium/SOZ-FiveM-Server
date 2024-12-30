import { FunctionComponent } from 'react';

import { NuiEvent } from '../../../shared/event/nui';
import { JobType } from '../../../shared/job';
import { MenuType } from '../../../shared/nui/menu';
import { EditorMenuData } from '../../../shared/object';
import { fetchNui } from '../../fetch';
import {
    MainMenu,
    Menu,
    MenuContent,
    MenuItemButton,
    MenuItemCheckbox,
    MenuItemText,
    MenuTitle,
} from '../Styleguide/Menu';

type MenuAlbumProps = {
    data: EditorMenuData;
};

export const MenuEditorObject: FunctionComponent<MenuAlbumProps> = ({ data }) => {
    if (!data) {
        return null;
    }

    let banner = 'https://cfx-nui-soz-core/public/images/banner/soz_hammer.webp';

    if (data.context === 'admin') {
        banner = 'https://nui-img/soz/menu_mapper';
    } else if (data.context === JobType.Gouv) {
        banner = 'https://nui-img/soz/menu_job_gouv';
    }

    return (
        <Menu type={MenuType.ObjectEditor}>
            <MainMenu>
                <MenuTitle banner={banner}>Edition d'objet</MenuTitle>
                <MenuContent>
                    <MenuItemButton
                        onConfirm={() => {
                            fetchNui(NuiEvent.ObjectEditorSave);
                        }}
                    >
                        ✔️ Valider le placement
                    </MenuItemButton>
                    <MenuItemButton
                        onConfirm={() => {
                            fetchNui(NuiEvent.ObjectEditorCancel);
                        }}
                    >
                        ❌ Annuler
                    </MenuItemButton>
                    {data.allowDelete && (
                        <MenuItemButton
                            onConfirm={() => {
                                fetchNui(NuiEvent.ObjectEditorDelete);
                            }}
                        >
                            ❌ Supprimer l'objet
                        </MenuItemButton>
                    )}
                    {data.allowToggleSnap && (
                        <MenuItemCheckbox
                            onChange={value => {
                                fetchNui(NuiEvent.ObjectEditorToggleSnap, { value });
                            }}
                            checked={data.snapToGround}
                            description="Aligne le prop sur le sol automatiquement."
                        >
                            ⬇️ Aligner au sol
                        </MenuItemCheckbox>
                    )}
                    {data.allowToggleCollision && (
                        <MenuItemCheckbox
                            onChange={value => {
                                fetchNui(NuiEvent.ObjectEditorToggleCollision, { value });
                            }}
                            checked={data.collision}
                            description="Active ou désactive la collision du prop. Si la collision est désactivée, le prop peut être agrandi, réduit, et tourné dans tous les sens."
                        >
                            Activer la collision
                        </MenuItemCheckbox>
                    )}
                    <MenuItemButton
                        onConfirm={() => {
                            fetchNui(NuiEvent.ObjectEditorReset, { position: true });
                        }}
                    >
                        🔄 Réinitialiser la position
                    </MenuItemButton>
                    <MenuItemButton
                        onConfirm={() => {
                            fetchNui(NuiEvent.ObjectEditorReset, { rotation: true });
                        }}
                    >
                        🔄 Réinitialiser la rotation
                    </MenuItemButton>
                    <MenuItemButton
                        onConfirm={() => {
                            fetchNui(NuiEvent.ObjectEditorReset, { scale: true });
                        }}
                    >
                        🔄 Réinitialiser l'échelle
                    </MenuItemButton>
                    <MenuItemButton
                        onConfirm={() => {
                            fetchNui(NuiEvent.ObjectEditorReset, { position: true, rotation: true, scale: true });
                        }}
                    >
                        🔄 Réinitialiser tout
                    </MenuItemButton>
                    <MenuTitle>Contrôle du mode editeur</MenuTitle>
                    <MenuItemText> Mode Translation : T</MenuItemText>
                    <MenuItemText> Mode Rotation : R</MenuItemText>
                    <MenuItemText> Mode Scale : S</MenuItemText>
                    <MenuItemText> Coordonnées locales : L</MenuItemText>
                    <MenuItemText> Rotation Camera : Clic Droit</MenuItemText>
                </MenuContent>
            </MainMenu>
        </Menu>
    );
};
