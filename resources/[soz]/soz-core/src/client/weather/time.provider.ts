import { Once, OnEvent } from '../../core/decorators/event';
import { Provider } from '../../core/decorators/provider';
import { ClientEvent } from '../../shared/event';
import { DayDurationInMinutes, IRLDayDurationInMinutes, Time } from '../../shared/weather';

@Provider()
export class TimeProvider {
    @OnEvent(ClientEvent.STATE_UPDATE_TIME)
    async onTimeChange(time: Time) {
        NetworkOverrideClockTime(time.hour, time.minute, time.second);
    }

    @Once()
    onStart(): void {
        SetMillisecondsPerGameMinute((DayDurationInMinutes * 60_000) / IRLDayDurationInMinutes);
    }
}
