import { On, OnEvent } from '../../core/decorators/event';
import { Inject } from '../../core/decorators/injectable';
import { Provider } from '../../core/decorators/provider';
import { Rpc } from '../../core/decorators/rpc';
import { Tick, TickInterval } from '../../core/decorators/tick';
import { Logger } from '../../core/logger';
import { ClientEvent } from '../../shared/event/client';
import { ServerEvent } from '../../shared/event/server';
import {
    PHONE_BOOTH_BILLING_INTERVAL,
    PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL,
    PHONE_BOOTH_RING_TIMEOUT,
} from '../../shared/phone-booth';
import { Err, isErr, Ok, Result } from '../../shared/result';
import { RpcServerEvent } from '../../shared/rpc';
import { TaxType } from '../../shared/tax';
import { PriceService } from '../bank/price.service';
import { Notifier } from '../notifier';
import { PlayerMoneyService } from '../player/player.money.service';
import { PhoneBoothState } from './phone.booth.state';
import { PhoneSimCardCalls } from './phone.simcard.calls';

type PickupResult = {
    number: string;
    connected: boolean;
};

@Provider()
export class PhoneBoothProvider {
    @Inject(PlayerMoneyService)
    private playerMoneyService: PlayerMoneyService;

    @Inject(PriceService)
    private priceService: PriceService;

    @Inject(PhoneBoothState)
    private phoneBoothState: PhoneBoothState;

    @Inject(PhoneSimCardCalls)
    private phoneSimCardCalls: PhoneSimCardCalls;

    @Inject(Notifier)
    private notifier: Notifier;

    @Inject(Logger)
    private logger: Logger;

    private attachments = new Map<string, number>();
    private activeCallKey = new Map<string, string>();
    private billing = new Map<string, number>();
    private nextChargeAt = new Map<string, number>();
    private ringing = new Map<string, NodeJS.Timeout>();

    @Rpc(RpcServerEvent.PHONE_BOOTH_PICKUP)
    public async pickup(source: number, boothNumber: string): Promise<Result<PickupResult, string>> {
        const booth = this.phoneBoothState.getBooth(boothNumber);
        if (!booth) {
            return Err('unknown-booth');
        }

        if (this.attachments.has(boothNumber)) {
            return Err('occupied');
        }

        this.attachments.set(boothNumber, source);

        if (!this.ringing.has(boothNumber)) {
            return Ok({ number: booth.number, connected: false });
        }

        const taxedPrice = await this.priceService.getPrice(PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL, TaxType.SERVICE);
        if (this.playerMoneyService.get(source, 'money') < taxedPrice) {
            this.attachments.delete(boothNumber);
            return Err('not-enough-cash');
        }

        this.stopRinging(boothNumber);

        const accepted = await this.phoneSimCardCalls.acceptBoothCall(source, boothNumber);
        if (isErr(accepted)) {
            this.attachments.delete(boothNumber);
            return accepted;
        }

        this.activeCallKey.set(boothNumber, accepted.ok);
        this.startBilling(boothNumber, source);

        return Ok({ number: booth.number, connected: true });
    }

    @Rpc(RpcServerEvent.PHONE_BOOTH_HANGUP)
    public async hangup(source: number, boothNumber: string): Promise<Result<boolean, string>> {
        if (this.attachments.get(boothNumber) !== source) {
            return Err('not-attached');
        }

        await this.clearBoothCall(boothNumber, source);
        this.attachments.delete(boothNumber);

        return Ok(true);
    }

    @Rpc(RpcServerEvent.PHONE_BOOTH_CALL)
    public async call(
        source: number,
        boothNumber: string,
        targetPhoneNumber: string
    ): Promise<Result<boolean, string>> {
        if (this.attachments.get(boothNumber) !== source) {
            return Err('not-attached');
        }

        if (this.activeCallKey.has(boothNumber)) {
            return Err('busy');
        }

        const taxedPrice = await this.priceService.getPrice(PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL, TaxType.SERVICE);
        if (this.playerMoneyService.get(source, 'money') < taxedPrice) {
            return Err('not-enough-cash');
        }

        const result = await this.phoneSimCardCalls.initCallFromBooth(source, boothNumber, targetPhoneNumber);
        if (isErr(result)) {
            return result;
        }

        this.activeCallKey.set(boothNumber, boothNumber);

        return Ok(true);
    }

    @OnEvent(ServerEvent.VOIP_PHONE_CALL_START)
    public onCallStarted(_source: number, callerPhone: string, _receiverPhone: string, callerSource?: number) {
        if (this.activeCallKey.get(callerPhone) === callerPhone && this.attachments.get(callerPhone) === callerSource) {
            this.startBilling(callerPhone, callerSource);
        }
    }

    @OnEvent(ServerEvent.PHONE_BOOTH_RING)
    public onRing(_source: number, boothNumber: string, callerPhone: string) {
        const booth = this.phoneBoothState.getBooth(boothNumber);
        if (!booth) {
            return;
        }

        if (this.attachments.has(boothNumber)) {
            void this.phoneSimCardCalls.declineBoothRing(callerPhone);
            return;
        }

        const timeout = setTimeout(() => {
            this.stopRinging(boothNumber);
            void this.phoneSimCardCalls.declineBoothRing(callerPhone);
        }, PHONE_BOOTH_RING_TIMEOUT);

        this.ringing.set(boothNumber, timeout);

        TriggerClientEvent(ClientEvent.PHONE_BOOTH_RING_START, -1, boothNumber);
    }

    @OnEvent(ServerEvent.PHONE_BOOTH_RING_STOP)
    public async onRingStop(_source: number, boothNumber: string) {
        const wasRinging = this.ringing.has(boothNumber);
        this.stopRinging(boothNumber);

        if (wasRinging) {
            return;
        }

        const attachedSource = this.attachments.get(boothNumber);
        if (attachedSource !== undefined && this.activeCallKey.get(boothNumber) === boothNumber) {
            await this.clearBoothCall(boothNumber, attachedSource);
            TriggerClientEvent(ClientEvent.PHONE_BOOTH_FORCE_HANGUP, attachedSource, boothNumber);
        }
    }

    private stopRinging(boothNumber: string) {
        const timeout = this.ringing.get(boothNumber);
        if (!timeout) {
            return;
        }

        clearTimeout(timeout);
        this.ringing.delete(boothNumber);
        TriggerClientEvent(ClientEvent.PHONE_BOOTH_RING_STOP, -1, boothNumber);
    }

    private startBilling(boothNumber: string, source: number) {
        this.billing.set(boothNumber, source);
        this.nextChargeAt.set(boothNumber, Date.now() + PHONE_BOOTH_BILLING_INTERVAL);

        void this.chargeBilling(boothNumber, source);
    }

    private stopBilling(boothNumber: string) {
        this.billing.delete(boothNumber);
        this.nextChargeAt.delete(boothNumber);
    }

    @Tick(TickInterval.EVERY_SECOND)
    public async billingTick() {
        const now = Date.now();
        const due: [string, number][] = [];

        for (const [boothNumber, source] of this.billing.entries()) {
            const chargeAt = this.nextChargeAt.get(boothNumber);
            if (chargeAt === undefined || now < chargeAt) {
                continue;
            }

            this.nextChargeAt.set(boothNumber, now + PHONE_BOOTH_BILLING_INTERVAL);
            due.push([boothNumber, source]);
        }

        const results = await Promise.allSettled(
            due.map(([boothNumber, source]) => this.chargeBilling(boothNumber, source))
        );

        for (const result of results) {
            if (result.status === 'rejected') {
                this.logger.error(`Erreur lors de la facturation d'une cabine téléphonique: ${result.reason}`);
            }
        }
    }

    private async chargeBilling(boothNumber: string, source: number) {
        if (this.attachments.get(boothNumber) !== source) {
            this.stopBilling(boothNumber);
            return;
        }

        const removed = await this.playerMoneyService.buy(
            source,
            PHONE_BOOTH_PRICE_PER_BILLING_INTERVAL,
            TaxType.SERVICE,
            'money'
        );
        if (removed) {
            return;
        }

        this.notifier.notify(source, "~r~Vous n'avez plus assez de liquide, l'appel est coupé.", 'error');
        this.stopBilling(boothNumber);
        await this.clearBoothCall(boothNumber, source);
        this.attachments.delete(boothNumber);
        TriggerClientEvent(ClientEvent.PHONE_BOOTH_FORCE_HANGUP, source, boothNumber);
    }

    @On('playerDropped')
    public async onPlayerDropped(source: number) {
        for (const [boothNumber, attachedSource] of this.attachments.entries()) {
            if (attachedSource === source) {
                await this.clearBoothCall(boothNumber, source);
                this.attachments.delete(boothNumber);
            }
        }
    }

    private async clearBoothCall(boothNumber: string, source: number) {
        const callKey = this.activeCallKey.get(boothNumber);
        if (callKey) {
            await this.phoneSimCardCalls.endCall(source, callKey);
            this.activeCallKey.delete(boothNumber);
        }

        this.stopBilling(boothNumber);
    }
}
