import { fetchNui } from '@public/nui/fetch';
import { NuiEvent } from '@public/shared/event';
import { HousingUpgradesMenuData } from '@public/shared/housing/menu';
import { ClosetTiers, FridgesTiers, GarageTiers, MoneyTiers, StashTiers } from '@public/shared/housing/upgrades';
import { MenuType } from '@public/shared/nui/menu';
import { FunctionComponent, useEffect, useState } from 'react';

import {
    MainMenu,
    Menu,
    MenuContent,
    MenuItemButton,
    MenuItemSelect,
    MenuItemSelectOptionBox,
    MenuTitle,
} from '../Styleguide/Menu';

type HousingUpgradesMenuProps = {
    data?: HousingUpgradesMenuData;
};

const defaultData = {
    hasParking: true,
    apartmentPrice: 0,
    enableParking: true,
    garageCurrentTier: 0,
    stashCurrentTier: 0,
    fridgeCurrentTier: 0,
    closetCurrentTier: 0,
    moneyCurrentTier: 0,
};

export const HousingUpgradesMenu: FunctionComponent<HousingUpgradesMenuProps> = ({ data }) => {
    const [state, setState] = useState({ ...defaultData, ...data });

    const banner = 'https://nui-img/soz/menu_housing_upgrades';

    useEffect(() => {
        setState({ ...state, ...data });
    }, [data]);

    useEffect(() => {
        const prices = calculatePrices();
        setState({ ...state, ...prices });
    }, [state.parking, state.garageTier, state.fridgeTier, state.moneyTier, state.closetTier, state.stashTier]);

    const calculatePrices = () => {
        const {
            apartmentPrice,
            garageCurrentTier,
            fridgeCurrentTier,
            moneyCurrentTier,
            closetCurrentTier,
            stashCurrentTier,
        } = state;
        let newPriceGarage = 0;
        let newPriceFridge = 0;
        let newPriceMoney = 0;
        let newPriceCloset = 0;
        let newPriceStash = 0;
        let newZkeaPrice = 0;

        for (let i = garageCurrentTier + 1; i <= state.garageTier; i++) {
            newPriceGarage += (apartmentPrice * GarageTiers[i].pricePercent) / 100;
            newZkeaPrice += GarageTiers[i].zkeaPrice;
        }
        for (let i = fridgeCurrentTier + 1; i <= state.fridgeTier; i++) {
            newPriceFridge += (apartmentPrice * FridgesTiers[i].pricePercent) / 100;
            newZkeaPrice += FridgesTiers[i].zkeaPrice;
        }
        for (let i = moneyCurrentTier + 1; i <= state.moneyTier; i++) {
            newPriceMoney += (apartmentPrice * MoneyTiers[i].pricePercent) / 100;
            newZkeaPrice += MoneyTiers[i].zkeaPrice;
        }
        for (let i = closetCurrentTier + 1; i <= state.closetTier; i++) {
            newPriceCloset += (apartmentPrice * ClosetTiers[i].pricePercent) / 100;
            newZkeaPrice += ClosetTiers[i].zkeaPrice;
        }
        for (let i = stashCurrentTier + 1; i <= state.stashTier; i++) {
            newPriceStash += (apartmentPrice * StashTiers[i].pricePercent) / 100;
            newZkeaPrice += StashTiers[i].zkeaPrice;
        }

        const parkingPrice = state.parking && !state.hasParking ? (apartmentPrice * 50) / 100 : 0;

        return {
            garagePrice: newPriceGarage,
            fridgePrice: newPriceFridge,
            moneyPrice: newPriceMoney,
            closetPrice: newPriceCloset,
            stashPrice: newPriceStash,
            zkeaPrice: newZkeaPrice,
            parkingPrice,
            totalPrice: newPriceGarage + parkingPrice + newPriceStash + newPriceCloset + newPriceFridge + newPriceMoney,
        };
    };

    const onConfirm = () => {
        console.log(state);
        // fetchNui(NuiEvent.HousingUpgradeApartment, { ...state });
    };

    const onChange = (selectedTier, target) => {
        setState({ ...state, [target]: selectedTier });
    };

    // const onParkingChange = (selected: boolean) => {
    //     setParking(selected);
    // };

    const renderMenuItemSelect = (title, icon, target, initialTier, tiers) => (
        <MenuItemSelect
            title={
                <div className="flex items-center">
                    <img alt="icon" className="ml-2 w-8 h-8" src={`/public/images/housing/${icon}.webp`} />
                    <h3 className="ml-4">{title}</h3>
                </div>
            }
            value={initialTier}
            onChange={(_, value) => onChange(value, target)}
            showAllOptions
            alignRight
        >
            {Object.keys(tiers).map(tier => {
                const value = parseInt(tier);
                const label = value !== 0 ? value : 'Origine';
                return (
                    <MenuItemSelectOptionBox
                        key={value}
                        value={value}
                        highlight={state[`${target}CurrentTier`] >= value}
                    >
                        {label}
                    </MenuItemSelectOptionBox>
                );
            })}
        </MenuItemSelect>
    );

    return (
        <Menu type={MenuType.HousingUpgrades}>
            <MainMenu>
                <MenuTitle banner={banner}></MenuTitle>
                <MenuContent>
                    {renderMenuItemSelect('Stockage', 'maison', 'stashTier', state.stashTier, StashTiers)}
                    {renderMenuItemSelect('Frigo', 'maison', 'fridgeTier', state.fridgeTier, FridgesTiers)}
                    {renderMenuItemSelect('Ceintre', 'maison', 'closetTier', state.closetTier, ClosetTiers)}
                    {renderMenuItemSelect('Coffre fort', 'maison', 'moneyTier', state.moneyTier, MoneyTiers)}
                    {state.hasParking && renderMenuItemSelect('Garage', 'garage', 'garageTier', state.garageTier, GarageTiers)}
                    <MenuItemButton className="border-t border-white/50" onConfirm={() => onConfirm()}>
                        <div className="flex w-full justify-between items-center">
                            <span>Confirmer</span>
                            <span>${state.totalPrice?.toFixed()}</span>
                        </div>
                    </MenuItemButton>
                </MenuContent>
            </MainMenu>
        </Menu>
    );
};
