import { Module } from '../../../core/decorators/module';
import { FoodFieldProvider } from './food.field.provider';
import { FoodHarvestProvider } from './food.harvest.provider';
import { FoodHuntProvider } from './food.hunt.provider';
import { FoodMealsProvider } from './food.meals.provider';

@Module({
    providers: [FoodFieldProvider, FoodMealsProvider, FoodHarvestProvider, FoodHuntProvider],
})
export class FoodModule {}
