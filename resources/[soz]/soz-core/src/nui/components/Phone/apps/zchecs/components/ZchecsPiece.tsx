import { Color, PieceSymbol } from 'chess.js';
import clsx from 'clsx';
import React, { FunctionComponent } from 'react';

/**
 * Rendu d'une piece. Affichage provisoire en lettres francaises.
 *
 * C'est le SEUL endroit a modifier pour passer aux images: remplacer le rendu
 * par un <img /> en gardant la signature { type, color, variant }. Les deux
 * variants pointeront alors vers les deux tailles d'asset.
 */

const LETTERS: Record<PieceSymbol, string> = {
    k: 'R', // Roi
    q: 'D', // Dame
    r: 'T', // Tour
    b: 'F', // Fou
    n: 'C', // Cavalier
    p: 'P', // Pion
};

export const PIECE_LABELS: Record<PieceSymbol, string> = {
    k: 'Roi',
    q: 'Dame',
    r: 'Tour',
    b: 'Fou',
    n: 'Cavalier',
    p: 'Pion',
};

interface ZchecsPieceProps {
    type: PieceSymbol;
    color: Color;
    /** `board` = jeton sur l'echiquier, `captured` = glyphe plat dans la liste des prises. */
    variant?: 'board' | 'captured';
    className?: string;
}

export const ZchecsPiece: FunctionComponent<ZchecsPieceProps> = ({ type, color, variant = 'board', className }) => {
    // Petite etiquette plate: pas de cercle ni de bordure, sinon a 16px ca devient
    // une pastille illisible. Les deux fonds sont contrastes sur theme clair ET sombre.
    if (variant === 'captured') {
        return (
            <span
                className={clsx(
                    'inline-flex items-center justify-center rounded-[3px] px-[3px] py-[1px]',
                    'text-[11px] font-bold leading-none select-none pointer-events-none',
                    {
                        'bg-white text-[#1B1714] ring-1 ring-black/25': color === 'w',
                        'bg-[#2B2723] text-white': color === 'b',
                    },
                    className
                )}
            >
                {LETTERS[type]}
            </span>
        );
    }

    return (
        <span
            className={clsx(
                'flex items-center justify-center rounded-full font-bold select-none pointer-events-none',
                'w-[34px] h-[34px] text-lg border-2 shadow-sm',
                {
                    // Blanc franc + bordure sombre: la case claire chess.com (#EBECD0)
                    // est trop pale pour une piece blanche cassee.
                    'bg-white text-[#1B1714] border-[#5C5147]': color === 'w',
                    'bg-[#2B2723] text-white border-[#0D0B0A]': color === 'b',
                },
                className
            )}
        >
            {LETTERS[type]}
        </span>
    );
};
