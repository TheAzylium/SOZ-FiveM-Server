import { useCallback, useRef } from 'react';

import { useAssetPath } from '../../../../hook/assets';
import { useConfig } from '../../system/config/config.atom';
import { usePhoneAvailable } from '../../system/phone.atom';
import { useSoundSettings } from '../../system/sound/hooks/useSound';
import { useSoundProvider } from '../../system/sound/providers/SoundProvider';

export type ZchecsSoundKind =
    | 'invite'
    | 'matched'
    | 'move'
    | 'draw-offer'
    | 'reminder'
    | 'win'
    | 'loss'
    | 'draw';

/** Dossier des sons ZChecs sur l'endpoint d'assets, sous `/static/game/`. */
export const ZCHECS_SOUND_FOLDER = 'audio/phone/misc';

/**
 * Nom de fichier (sans extension) attendu sur le CDN pour chaque événement.
 * Le dossier `misc` est partagé avec les sons systeme du téléphone, d'où le préfixe.
 */
export const ZCHECS_SOUND_FILES: Record<ZchecsSoundKind, string> = {
    invite: 'zchecs-invite',
    matched: 'zchecs-matched',
    move: 'zchecs-move',
    'draw-offer': 'zchecs-draw-offer',
    reminder: 'zchecs-reminder',
    win: 'zchecs-win',
    loss: 'zchecs-loss',
    draw: 'zchecs-draw',
};

export const useZchecsSound = () => {
    const { getPath } = useAssetPath();
    const { mount, play } = useSoundProvider();
    const isPhoneAvailable = usePhoneAvailable();
    const config = useConfig();

    // Repli tant que le son n'est pas disponible sur le CDN.
    const fallback = useSoundSettings('notiSound');

    // Une URL qui a échoué au chargement ne sera plus retentée de la session.
    // La clé étant l'URL complète, un changement d'endpoint réinitialise le cache.
    const missing = useRef<Set<string>>(new Set());

    return useCallback(
        async (kind: ZchecsSoundKind) => {
            if (!isPhoneAvailable) {
                return;
            }

            const volume = config.planeMode ? 0 : (config.notiSoundVol ?? 50) / 100;

            if (volume <= 0) {
                return;
            }

            const url = getPath(`${ZCHECS_SOUND_FOLDER}/${ZCHECS_SOUND_FILES[kind]}.mp3`);

            if (!missing.current.has(url)) {
                const mounted = await mount(url, volume, false);

                if (mounted) {
                    play(url, volume, false);

                    return;
                }

                missing.current.add(url);
                console.warn(`[ZChecs] son absent (${url}), repli sur le son de notification du téléphone.`);
            }

            play(fallback.sound, fallback.volume, false);
        },
        [
            isPhoneAvailable,
            config.planeMode,
            config.notiSoundVol,
            getPath,
            mount,
            play,
            fallback.sound,
            fallback.volume,
        ]
    );
};
