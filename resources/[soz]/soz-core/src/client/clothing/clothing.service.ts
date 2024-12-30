import { Inject, Injectable } from '../../core/decorators/injectable';
import { Component, KeepHairWithMask, Outfit, OutfitItem, Prop } from '../../shared/cloth';
import { PlayerService } from '../player/player.service';

@Injectable()
export class ClothingService {
    @Inject(PlayerService)
    public playerService: PlayerService;

    public applyComponent(component: Component, outfitItem: OutfitItem) {
        SetPedComponentVariation(
            PlayerPedId(),
            Number(component),
            Number(outfitItem.Drawable),
            Number(outfitItem.Texture),
            Number(outfitItem.Palette)
        );
    }

    public displayHairWithMask(maskDrawable: number): boolean {
        return KeepHairWithMask[maskDrawable];
    }

    public applyProp(prop: Prop, outfitItem: OutfitItem) {
        if (outfitItem.Clear) {
            ClearPedProp(PlayerPedId(), Number(prop));
        } else {
            SetPedPropIndex(PlayerPedId(), Number(prop), outfitItem.Drawable || 0, outfitItem.Texture || 0, true);
        }
    }

    public applyOutfit(outfit: Outfit) {
        for (const [componentIndex, component] of Object.entries(outfit.Components)) {
            this.applyComponent(Number(componentIndex), component);

            if (Number(componentIndex) == Component.Mask) {
                let hair = 0;
                if (this.displayHairWithMask(component.Drawable)) {
                    hair = this.playerService.getPlayer().skin.Hair.HairType;
                }
                SetPedComponentVariation(PlayerPedId(), Component.Hair, hair, 0, 0);
            }
        }

        for (const [propIndex, prop] of Object.entries(outfit.Props)) {
            this.applyProp(Number(propIndex), prop);
        }
    }

    public getClothSet(): Outfit {
        const components: Outfit['Components'] = {};

        for (const componentIndex of Object.keys(Component).filter(key => !isNaN(Number(key)))) {
            const componentId = Number(componentIndex);
            const drawableId = GetPedDrawableVariation(PlayerPedId(), componentId);
            const textureId = GetPedTextureVariation(PlayerPedId(), componentId);

            components[componentIndex] = {
                Drawable: drawableId,
                Texture: textureId,
                Palette: 0,
            };
        }

        const props: Outfit['Props'] = {};
        for (const propIndex of Object.values(Prop).filter(key => !isNaN(Number(key)))) {
            const propId = Number(propIndex);
            const drawableId = GetPedPropIndex(PlayerPedId(), propId);
            const textureId = GetPedPropTextureIndex(PlayerPedId(), propId);

            props[propIndex] = {
                Drawable: drawableId,
                Texture: textureId,
            };
        }

        return {
            Components: components,
            Props: props,
        };
    }

    public getMaxOptions() {
        const maxOptions = [];
        for (const componentIndex of Object.values(Component).filter(key => !isNaN(Number(key)) && key !== '7')) {
            const componentId = Number(componentIndex);
            const maxDrawable = GetNumberOfPedDrawableVariations(PlayerPedId(), componentId);
            maxOptions.push({
                componentIndex: componentIndex,
                maxDrawables: maxDrawable,
            });
        }

        for (const propIndex of Object.values(Prop).filter(key => !isNaN(Number(key)))) {
            const propId = Number(propIndex);
            const maxDrawable = GetNumberOfPedPropDrawableVariations(PlayerPedId(), propId);
            maxOptions.push({
                propIndex: propIndex,
                maxDrawables: maxDrawable,
            });
        }

        return maxOptions;
    }

    public checkWearingGloves(): boolean {
        const ped = PlayerPedId();
        const armIndex = GetPedDrawableVariation(ped, 3);
        const model = GetEntityModel(ped);
        if (model == GetHashKey('mp_m_freemode_01')) {
            if (
                armIndex < 16 ||
                armIndex == 18 ||
                (armIndex >= 52 && armIndex <= 62) ||
                armIndex == 97 ||
                armIndex == 98 ||
                armIndex == 112 ||
                armIndex == 113 ||
                armIndex == 114 ||
                armIndex == 118 ||
                armIndex == 125 ||
                armIndex == 132 ||
                armIndex == 164 ||
                armIndex == 169 ||
                armIndex == 184 ||
                armIndex == 188 ||
                armIndex == 196 ||
                armIndex == 197 ||
                armIndex == 198 ||
                armIndex == 202
            ) {
                return false;
            } else {
                return true;
            }
        } else {
            if (
                armIndex < 16 ||
                armIndex == 19 ||
                (armIndex >= 59 && armIndex <= 71) ||
                armIndex == 112 ||
                armIndex == 113 ||
                armIndex == 129 ||
                armIndex == 130 ||
                armIndex == 131 ||
                armIndex == 135 ||
                armIndex == 142 ||
                armIndex == 149 ||
                armIndex == 153 ||
                armIndex == 157 ||
                armIndex == 161 ||
                armIndex == 165 ||
                armIndex == 205 ||
                armIndex == 210 ||
                armIndex == 229 ||
                armIndex == 233 ||
                armIndex == 241 ||
                armIndex == 242
            ) {
                return false;
            } else {
                return true;
            }
        }
    }
}
