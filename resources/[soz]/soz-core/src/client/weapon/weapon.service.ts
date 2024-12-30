import { VehicleSeat } from '@public/shared/vehicle/vehicle';

import { Inject, Injectable } from '../../core/decorators/injectable';
import { InventoryItem } from '../../shared/item';
import { GlobalWeaponConfig, WeaponConfig, WeaponName, Weapons } from '../../shared/weapons/weapon';
import { PlayerService } from '../player/player.service';

const MONEY_CASE_HASH = GetHashKey('WEAPON_BRIEFCASE');

const backVeh = [
    GetHashKey('stockade'),
    GetHashKey('youga4'),
    GetHashKey('burrito'),
    GetHashKey('burrito2'),
    GetHashKey('burrito3'),
    GetHashKey('burrito4'),
    GetHashKey('gburrito'),
    GetHashKey('gburrito2'),
    GetHashKey('ambulance'),
    GetHashKey('ambulance2'),
    GetHashKey('policet'),
    GetHashKey('riot'),
    GetHashKey('mule'),
    GetHashKey('mule3'),
    GetHashKey('mule5'),
    GetHashKey('speedo'),
    GetHashKey('speedo2'),
    GetHashKey('speedo4'),
    GetHashKey('rumpo'),
    GetHashKey('boxville'),
    GetHashKey('boxville2'),
    GetHashKey('boxville3'),
    GetHashKey('boxville4'),
    GetHashKey('boxville5'),
    GetHashKey('boxville6'),
    GetHashKey('pony'),
];

const farBackVeh = [GetHashKey('bison'), GetHashKey('dubsta3')];

@Injectable()
export class WeaponService {
    private currentWeapon: InventoryItem | null = null;
    private disabledReasons = new Set<string>();

    @Inject(PlayerService)
    private playerService: PlayerService;

    getWeaponFromSlot(slot: number): InventoryItem | null {
        return Object.values(this.playerService.getPlayer().items).find(
            item => item.type === 'weapon' && item.slot === slot
        );
    }

    getCurrentWeapon(): InventoryItem | null {
        return this.currentWeapon;
    }

    async set(weapon: InventoryItem) {
        if (this.disabledReasons.size > 0) {
            return;
        }

        const player = PlayerPedId();
        const weaponHash = GetHashKey(weapon.name);
        const ammo = weapon.metadata.ammo >= 0 ? weapon.metadata.ammo : 0;

        this.currentWeapon = weapon;

        GiveWeaponToPed(player, weaponHash, ammo, false, true);

        if (weapon.metadata.tint) {
            SetPedWeaponTintIndex(player, weaponHash, weapon.metadata.tint);
        }

        if (weapon.metadata.attachments) {
            Object.values(weapon.metadata.attachments).forEach(attachment => {
                GiveWeaponComponentToPed(player, weaponHash, GetHashKey(attachment));
            });
        }

        SetPedAmmo(player, weaponHash, ammo);
        SetCurrentPedWeapon(player, weaponHash, true);
    }

    async clear() {
        const player = PlayerPedId();
        if (this.currentWeapon) {
            const currhash = GetHashKey(this.currentWeapon.name);
            if (currhash !== GetHashKey(WeaponName.UNARMED)) {
                RemoveWeaponFromPed(player, currhash);
            }
        }
        this.currentWeapon = null;

        const [, hash] = GetCurrentPedWeapon(player, false);

        if (hash !== GetHashKey(WeaponName.UNARMED) && hash !== MONEY_CASE_HASH) {
            SetCurrentPedWeapon(player, GetHashKey(WeaponName.UNARMED), true);
            RemoveWeaponFromPed(player, hash);
        }
    }

    getMaxAmmoInClip(): number {
        if (!this.currentWeapon) {
            return 0;
        }

        const player = PlayerPedId();
        const weaponHash = GetSelectedPedWeapon(player);

        return GetMaxAmmoInClip(player, weaponHash, true);
    }

    async recoil() {
        if (!this.currentWeapon) {
            return;
        }

        const recoil = this.getWeaponConfig(this.currentWeapon.name)?.recoil ?? 0;
        const recoilHorizontal = Math.random() - 0.5;
        const weaponHealth = this.currentWeapon.metadata.health > 0 ? this.currentWeapon.metadata.health : 1;
        const maxWeaponHealth = this.currentWeapon.metadata.maxHealth ?? GlobalWeaponConfig.MaxHealth;
        const healthdeviation = GlobalWeaponConfig.RecoilOnUsedWeapon * (1 - weaponHealth / maxWeaponHealth);

        const recoilY = recoil + healthdeviation;
        const recoilX = recoilHorizontal > 0 ? recoilHorizontal + healthdeviation : recoilHorizontal - healthdeviation;

        let backveh = 0;
        if (GetFollowVehicleCamViewMode() == 4) {
            const ped = PlayerPedId();
            const veh = GetVehiclePedIsIn(ped, false);
            if (veh) {
                const model = GetEntityModel(veh);
                if (backVeh.includes(model)) {
                    if (GetPedInVehicleSeat(veh, VehicleSeat.BackRight) == ped) {
                        backveh = -90;
                    } else if (GetPedInVehicleSeat(veh, VehicleSeat.BackLeft) == ped) {
                        backveh = 90;
                    }
                } else if (farBackVeh.includes(model)) {
                    if (GetPedInVehicleSeat(veh, VehicleSeat.ExtraSeat2) == ped) {
                        backveh = -90;
                    } else if (GetPedInVehicleSeat(veh, VehicleSeat.ExtraSeat1) == ped) {
                        backveh = 90;
                    }
                }
            }
        }

        const pitch = GetGameplayCamRelativePitch();
        const heading = GetGameplayCamRelativeHeading();

        SetGameplayCamRelativeRotation(heading + recoilX + backveh, pitch + recoilY, 1.0);
    }

    getWeaponConfig(weaponName: string): WeaponConfig | null {
        return Weapons[weaponName.toUpperCase()] ?? null;
    }

    setDisabled(reason: string, value: boolean): void {
        if (value) {
            this.disabledReasons.add(reason);
            this.clear();
        } else {
            this.disabledReasons.delete(reason);
        }
    }
}
