import { OnEvent } from '../../../core/decorators/event';
import { Inject } from '../../../core/decorators/injectable';
import { Provider } from '../../../core/decorators/provider';
import { ServerEvent } from '../../../shared/event/server';
import { JobPermission, JobType } from '../../../shared/job';
import { JobService } from '../../job.service';
import { Notifier } from '../../notifier';
import { PlayerService } from '../../player/player.service';
import { FineRepository } from '../../repository/fine.repository';

@Provider()
export class GouvFineProvider {
    @Inject(FineRepository)
    private fineRepository: FineRepository;

    @Inject(JobService)
    private jobService: JobService;

    @Inject(PlayerService)
    private playerService: PlayerService;

    @Inject(Notifier)
    private notifier: Notifier;

    @OnEvent(ServerEvent.GOUV_FINE_ADD)
    public async addFine(source: number, label: string, category: number, min: number, max: number) {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return;
        }

        if (!(await this.jobService.hasPermission(player, JobType.Gouv, JobPermission.GouvManageFine))) {
            return;
        }

        await this.fineRepository.add(label, category, min, max);

        this.notifier.notify(source, `L'amende ~g~${label}~s~ a été ajoutée avec succès.`);
    }

    @OnEvent(ServerEvent.GOUV_FINE_REMOVE)
    public async removeFine(source: number, id: number) {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return;
        }

        if (!(await this.jobService.hasPermission(player, JobType.Gouv, JobPermission.GouvManageFine))) {
            return;
        }

        await this.fineRepository.remove(id);

        this.notifier.notify(source, `L'amende a été supprimée avec succès.`);
    }

    @OnEvent(ServerEvent.GOUV_FINE_SET_LABEL)
    public async setFineLabel(source: number, id: number, label: string) {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return;
        }

        if (!(await this.jobService.hasPermission(player, JobType.Gouv, JobPermission.GouvManageFine))) {
            return;
        }

        await this.fineRepository.setLabel(id, label);

        this.notifier.notify(source, `Le label de l'amende a été modifié avec succès.`);
    }

    @OnEvent(ServerEvent.GOUV_FINE_SET_MIN_PRICE)
    public async setFineMinPrice(source: number, id: number, price: number) {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return;
        }

        if (!(await this.jobService.hasPermission(player, JobType.Gouv, JobPermission.GouvManageFine))) {
            return;
        }

        await this.fineRepository.setMinPrice(id, price);

        this.notifier.notify(source, `Le prix minimum de l'amende a été modifié avec succès.`);
    }

    @OnEvent(ServerEvent.GOUV_FINE_SET_MAX_PRICE)
    public async setFineMaxPrice(source: number, id: number, price: number) {
        const player = this.playerService.getPlayer(source);

        if (!player) {
            return;
        }

        if (!(await this.jobService.hasPermission(player, JobType.Gouv, JobPermission.GouvManageFine))) {
            return;
        }

        await this.fineRepository.setMaxPrice(id, price);

        this.notifier.notify(source, `Le prix maximum de l'amende a été modifié avec succès.`);
    }
}
