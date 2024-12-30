import { FunctionComponent, useState } from 'react';

import { useNuiEvent } from '../../hook/nui';

export const ColdOverlay: FunctionComponent = () => {
    const [coldMode, setColdMode] = useState(false);
    useNuiEvent('cold', 'cold', setColdMode);

    if (!coldMode) {
        return null;
    }

    return (
        <div className="fixed items-center justify-center flex w-full bottom-[6rem] text-white/75">
            <div className="breathing-icon-container items-center justify-center flex">
                <div
                    className="w-24 h-24 breathing-icon bg-no-repeat bg-contain"
                    style={{
                        backgroundImage: 'url(/public/images/hud/snowflake.webp)',
                    }}
                />
            </div>
        </div>
    );
};
