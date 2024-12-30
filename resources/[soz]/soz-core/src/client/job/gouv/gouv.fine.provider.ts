import { OnNuiEvent } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { NuiEvent } from '../../../shared/event/nui';
import { ServerEvent } from '../../../shared/event/server';
import { NotEmptyStringValidator, PositiveNumberValidator } from '../../../shared/nui/input';
import { InputService } from '../../nui/input.service';

@Provider()
export class GouvFineProvider {
    @Inject(InputService)
    private inputService: InputService;

    @OnNuiEvent(NuiEvent.GouvFineAdd)
    public async addFine({ category }: { category: number }) {
        const label = await this.inputService.askInput(
            {
                title: "Nom de l'amende",
            },
            NotEmptyStringValidator
        );

        if (!label) {
            return;
        }

        const minPrice = await this.inputService.askInput(
            {
                title: 'Prix minimum',
            },
            PositiveNumberValidator
        );

        if (!minPrice) {
            return;
        }

        const maxPrice = await this.inputService.askInput(
            {
                title: 'Prix maximum',
            },
            PositiveNumberValidator
        );

        if (!maxPrice) {
            return;
        }

        TriggerServerEvent(ServerEvent.GOUV_FINE_ADD, label, category, minPrice, maxPrice);
    }
    @OnNuiEvent(NuiEvent.GouvFineRemove)
    public async removeFine({ id }: { id: number }) {
        const remove = await this.inputService.askConfirm('Êtes-vous sûr de vouloir supprimer cette amende ?');

        if (!remove) {
            return;
        }

        TriggerServerEvent(ServerEvent.GOUV_FINE_REMOVE, id);
    }
    @OnNuiEvent(NuiEvent.GouvFineSetLabel)
    public async setFineLabel({ id }: { id: number }) {
        const label = await this.inputService.askInput(
            {
                title: "Nom de l'amende",
            },
            NotEmptyStringValidator
        );

        if (!label) {
            return;
        }

        TriggerServerEvent(ServerEvent.GOUV_FINE_SET_LABEL, id, label);
    }
    @OnNuiEvent(NuiEvent.GouvFineSetMinPrice)
    public async setFineMinPrice({ id }: { id: number }) {
        const minPrice = await this.inputService.askInput(
            {
                title: 'Prix minimum',
            },
            PositiveNumberValidator
        );

        if (!minPrice) {
            return;
        }

        TriggerServerEvent(ServerEvent.GOUV_FINE_SET_MIN_PRICE, id, minPrice);
    }
    @OnNuiEvent(NuiEvent.GouvFineSetMaxPrice)
    public async setFineMaxPrice({ id }: { id: number }) {
        const maxPrice = await this.inputService.askInput(
            {
                title: 'Prix maximum',
            },
            PositiveNumberValidator
        );

        if (!maxPrice) {
            return;
        }

        TriggerServerEvent(ServerEvent.GOUV_FINE_SET_MAX_PRICE, id, maxPrice);
    }
}
