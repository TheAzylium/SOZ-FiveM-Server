import { Color, PieceSymbol } from 'chess.js';
import clsx from 'clsx';
import React, { FunctionComponent } from 'react';

/**
 * Rendu d'une piece. Affichage provisoire en lettres francaises.
 *
 * C'est le SEUL endroit a modifier pour passer aux images: remplacer le <span>
 * par un <img src={...} /> en gardant la meme signature { type, color }.
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
    className?: string;
}

export const ZchecsPiece: FunctionComponent<ZchecsPieceProps> = ({ type, color, className }) => {
    return (
        <span
            className={clsx(
                'flex items-center justify-center rounded-full font-bold select-none pointer-events-none',
                'w-[34px] h-[34px] text-lg border',
                {
                    'bg-[#F5F0E6] text-[#1B1714] border-[#8A8073]': color === 'w',
                    'bg-[#2B2723] text-[#F5F0E6] border-[#0D0B0A]': color === 'b',
                },
                className
            )}
        >
            {LETTERS[type]}
        </span>
    );
};
