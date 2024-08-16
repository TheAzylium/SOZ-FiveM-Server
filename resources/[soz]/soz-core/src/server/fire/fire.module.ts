import {FireProvider} from "./fire.provider";
import {Module} from "../../core/decorators/module";

@Module({
    providers: [FireProvider],
})

export class FireModule {}