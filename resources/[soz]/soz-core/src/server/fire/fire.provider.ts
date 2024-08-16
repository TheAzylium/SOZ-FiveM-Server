import {Command} from "../../core/decorators/command";
import {Provider} from "../../core/decorators/provider";
import {Inject} from "../../core/decorators/injectable";
import {Logger} from "../../core/logger";
import {FireService} from "./fire.service";
import {PlayerService} from "../player/player.service";

@Provider()
export class FireProvider {
  @Inject(Logger)
  private logger: Logger;
  @Inject(FireService)
  private fireService: FireService;

  @Inject(PlayerService)
  private playerService: PlayerService;


  @Command('startFire')
  startFire() {
    console.log('test')
    this.logger.info('Starting fire');
    this.fireService.startFire([0, 0]);
  }

  @Command('test')
  test() {
    this.logger.debug(this.fireService.getFireList().toString())
  }
}