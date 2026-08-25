import { Color, PieceSymbol } from 'chess.js';
import React, { FunctionComponent } from 'react';

import { computeMaterial, ZchecsColor } from '../../../../../../shared/phone/apps/zchecs';
import { ZchecsPiece } from './ZchecsPiece';

interface ZchecsMaterialProps {
    fen: string;
    /** Camp dont on affiche les prises. */
    side: ZchecsColor;
}

/**
 * Pièces prises par un camp + avantage matériel, déduits de la position
 * comparée à la position de départ (aucune donnée supplémentaire à stocker).
 */
export const ZchecsMaterial: FunctionComponent<ZchecsMaterialProps> = ({ fen, side }) => {
    const material = computeMaterial(fen);
    const captured = side === 'w' ? material.capturedByWhite : material.capturedByBlack;
    const advantage = side === 'w' ? material.balance : -material.balance;

    // Ligne réservée même à vide: évite que le plateau saute à la première prise.
    if (captured.length === 0 && advantage <= 0) {
        return <div className="h-5" />;
    }

    return (
        <div className="flex flex-wrap items-center gap-1 min-h-[1.25rem] px-1">
            {captured.map((type, index) => (
                <ZchecsPiece
                    key={`${type}-${index}`}
                    type={type as PieceSymbol}
                    // Les pièces prises par les blancs sont des pièces noires.
                    color={(side === 'w' ? 'b' : 'w') as Color}
                    variant="captured"
                />
            ))}
            {advantage > 0 && <span className="text-xs font-semibold text-gray-400 ml-0.5">+{advantage}</span>}
        </div>
    );
};
