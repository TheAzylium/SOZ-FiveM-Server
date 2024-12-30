import { Module } from '../../core/decorators/module';
import { BankProvider } from './bank.provider';
import { BankTaxProvider } from './bank.tax.provider';

@Module({
    providers: [BankProvider, BankTaxProvider],
})
export class BankModule {}
