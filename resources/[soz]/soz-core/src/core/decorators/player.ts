import { PlayerData } from '@public/shared/player';

import { addMethodMetadata } from './reflect';

export const PlayerListenerMetadataKey = 'soz_core.decorator.player';

export const PlayerUpdate = () => {
    return (
        target: any,
        propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<(data?: PlayerData) => any>
    ) => {
        addMethodMetadata(PlayerListenerMetadataKey, {}, target, propertyKey);

        return descriptor;
    };
};
