import { setMethodMetadata } from './reflect';

export const CronMetadataKey = 'soz_core.decorator.on_cron';

export type CronMetadata = {
    hour: number;
    minute: number;
    dayOfWeek?: number;
    timezone?: string;
};

export const Cron = (hour: number, minute = 0, dayOfWeek = null, timezone = null): MethodDecorator => {
    return (target, propertyKey) => {
        setMethodMetadata(
            CronMetadataKey,
            {
                hour,
                minute,
                dayOfWeek,
                timezone,
            },
            target,
            propertyKey
        );
    };
};
