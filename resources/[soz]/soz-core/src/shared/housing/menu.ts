import { Property } from '@public/shared/housing/housing';
import { ZoneTyped } from '@public/shared/polyzone/box.zone';
import { SenateParty } from '@public/shared/senate';

export type HousingUpgradesMenuData = {
    currentTier: number;
    hasParking: boolean;
    apartmentPrice: number;
    enableParking: boolean;
    garageCurrentTier: number;
    stashCurrentTier: number;
    fridgeCurrentTier: number;
    closetCurrentTier: number;
    moneyCurrentTier: number;
    // Ajoutez les propriétés manquantes ici
    tier: number;
    parking: boolean;
    garageTier: number;
    fridgeTier: number;
    closetTier: number;
    moneyTier: number;
    stashTier: number;
    // Ajoutez les propriétés de prix ici
    tierPrice: number;
    garagePrice: number;
    fridgePrice: number;
    closetPrice: number;
    moneyPrice: number;
    stashPrice: number;
    zkeaPrice: number;
    parkingPrice: number;
    totalPrice: number;
};

export type AdminMapperMenuData = {
    properties: Property[];
    zones: ZoneTyped[];
    showInterior: boolean;
    parties: SenateParty[];
};
