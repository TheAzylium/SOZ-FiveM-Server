import React from 'react';

import { IconComponentProps } from '../../system/phone.types';

/**
 * Icone inline: les assets .webp des apps sont servis depuis le CDN et ne sont pas
 * dans le depot. Une fois `images/phone/apps/zchecs/logo.webp` uploade, ce composant
 * peut etre remplace par `<AppSimpleIcon {...props} name="zchecs" />`.
 */
const ZchecsIcon: React.FC<IconComponentProps> = props => {
    return (
        <svg {...props} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <rect width="64" height="64" rx="14" fill="#2F2A26" />
            <rect x="8" y="8" width="12" height="12" fill="#F2E8DC" />
            <rect x="32" y="8" width="12" height="12" fill="#F2E8DC" />
            <rect x="20" y="20" width="12" height="12" fill="#F2E8DC" />
            <rect x="44" y="20" width="12" height="12" fill="#F2E8DC" />
            <path
                d="M23 50h20c0-4-2-6-4-7 3-2 4-5 3-9-1-5-5-8-9-8-3 0-5 1-6 3l-3-2-2 4 3 2c-2 3-3 6-3 9 0 4 2 6 5 8-2 1-4 3-4 7z"
                fill="#E4B87C"
                stroke="#1B1714"
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <circle cx="27" cy="31" r="2" fill="#1B1714" />
        </svg>
    );
};

export default ZchecsIcon;
