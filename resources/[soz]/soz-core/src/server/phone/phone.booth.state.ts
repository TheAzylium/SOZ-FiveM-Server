import { PhoneBoothLocations } from '../../config/phone-booth';
import { Injectable } from '../../core/decorators/injectable';
import { PhoneBooth } from '../../shared/phone-booth';

@Injectable()
export class PhoneBoothState {
    private boothsByNumber: Map<string, PhoneBooth> = new Map(
        Object.values(PhoneBoothLocations).map(booth => [booth.number, booth])
    );

    public isBoothNumber(phoneNumber: string): boolean {
        return this.boothsByNumber.has(phoneNumber);
    }

    public getBooth(phoneNumber: string): PhoneBooth | null {
        return this.boothsByNumber.get(phoneNumber) ?? null;
    }
}
