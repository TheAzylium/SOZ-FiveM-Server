import { Inject, Injectable } from '../decorators/injectable';
import { CronLoader } from './cron.loader';
import { ProviderLoader } from './provider.loader';
import { RouteLoader } from './route.loader';

@Injectable(ProviderLoader)
export class ProviderServerLoader extends ProviderLoader {
    @Inject(RouteLoader)
    private routeLoader: RouteLoader;

    @Inject(CronLoader)
    private cronLoader: CronLoader;

    public load(provider): void {
        super.load(provider);

        this.routeLoader.load(provider);
        this.cronLoader.load(provider);
    }

    public unload(): void {
        super.unload();

        this.routeLoader.unload();
        this.cronLoader.unload();
    }
}
