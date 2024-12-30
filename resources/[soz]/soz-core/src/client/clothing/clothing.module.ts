import { Module } from '@public/core/decorators/module';

import { ClothingProvider } from './clothing.provider';

@Module({
    providers: [ClothingProvider],
})
export class ClothingModule {}
