import { Module } from '../../../core/decorators/module';
import { FoodCraftProvider } from './food.craft.provider';
import { FoodFieldProvider } from './food.field.provider';
import { FoodHuntProvider } from './food.hunt.provider';
import { FoodMealsProvider } from './food.meals.provider';
import { FoodProvider } from './food.provider';
import { FoodResellProvider } from './food.resell.provider';

@Module({
    providers: [
        FoodCraftProvider,
        FoodFieldProvider,
        FoodHuntProvider,
        FoodMealsProvider,
        FoodProvider,
        FoodResellProvider,
    ],
})
export class FoodModule {}
