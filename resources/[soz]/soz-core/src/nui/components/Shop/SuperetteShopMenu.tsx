import { BrandConfig, BrandsConfig } from '@public/config/shops';
import { fetchNui } from '@public/nui/fetch';
import { NuiEvent } from '@public/shared/event';
import { MenuType } from '@public/shared/nui/menu';
import { ShopProduct } from '@public/shared/shop';
import { FunctionComponent } from 'react';

import { TaxType } from '../../../shared/bank';
import { useGetPrice } from '../../hook/price';
import { MainMenu, Menu, MenuContent, MenuItemButton, MenuTitle } from '../Styleguide/Menu';

type MenuSuperetteShopStateProps = {
    data: {
        brand: string;
        products: ShopProduct[];
    };
};

export const SuperetteShopMenu: FunctionComponent<MenuSuperetteShopStateProps> = ({ data }) => {
    const config = BrandsConfig[data.brand] as BrandConfig;
    const getPrice = useGetPrice();

    if (!data.products || data.products.length === 0 || !data.brand || !config) {
        return null;
    }

    return (
        <Menu type={MenuType.SuperetteShop}>
            <MainMenu>
                <MenuTitle banner={config.banner}> Magasin {config.label} </MenuTitle>
                <MenuContent>
                    {data.products.map((product, id) => (
                        <MenuItemButton
                            key={id}
                            onConfirm={async () => {
                                await fetchNui(NuiEvent.SuperetteShopBuy, product);
                            }}
                            description={product.item?.description ?? ''}
                        >
                            <div className="flex justify-between items-center">
                                <span>{product.item?.label ?? '[invalid name]'}</span>
                                <span className="mr-1">
                                    $
                                    {getPrice(
                                        product.price,
                                        product.type === 'weapon' || product.type === 'weapon_ammo'
                                            ? TaxType.WEAPON
                                            : TaxType.SUPPLY
                                    )}
                                </span>
                            </div>
                        </MenuItemButton>
                    ))}
                </MenuContent>
            </MainMenu>
        </Menu>
    );
};
