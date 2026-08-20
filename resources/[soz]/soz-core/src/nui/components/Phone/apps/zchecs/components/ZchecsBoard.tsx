import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import clsx from 'clsx';
import React, { FunctionComponent, useMemo, useState } from 'react';

import { ZchecsColor } from '../../../../../../shared/phone/apps/zchecs';
import { PIECE_LABELS, ZchecsPiece } from './ZchecsPiece';

const PROMOTION_CHOICES: PieceSymbol[] = ['q', 'r', 'b', 'n'];

interface ZchecsBoardProps {
    fen: string;
    myColor: ZchecsColor;
    /** false quand ce n'est pas mon tour, que la partie est finie ou en attente. */
    interactive: boolean;
    onMove: (from: string, to: string, promotion?: string) => void;
}

export const ZchecsBoard: FunctionComponent<ZchecsBoardProps> = ({ fen, myColor, interactive, onMove }) => {
    const [selected, setSelected] = useState<Square | null>(null);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

    const chess = useMemo(() => {
        try {
            return new Chess(fen);
        } catch (e) {
            return new Chess();
        }
    }, [fen]);

    // Les cases atteignables ne sont calculees que pour MES pieces, et seulement a mon tour.
    const legalMoves: Move[] = useMemo(() => {
        if (!interactive || !selected) {
            return [];
        }

        try {
            return chess.moves({ square: selected, verbose: true });
        } catch (e) {
            return [];
        }
    }, [chess, selected, interactive]);

    const targets = useMemo(() => new Map(legalMoves.map(move => [move.to, move])), [legalMoves]);

    const rows = useMemo(() => {
        const board = chess.board();

        return myColor === 'b' ? [...board].reverse().map(row => [...row].reverse()) : board;
    }, [chess, myColor]);

    const kingInCheckSquare = useMemo(() => {
        if (!chess.inCheck()) {
            return null;
        }

        const turn = chess.turn();

        for (const row of chess.board()) {
            for (const cell of row) {
                if (cell && cell.type === 'k' && cell.color === turn) {
                    return cell.square;
                }
            }
        }

        return null;
    }, [chess]);

    const handleSquareClick = (square: Square) => {
        if (!interactive || pendingPromotion) {
            return;
        }

        const target = targets.get(square);

        if (target) {
            // Plusieurs coups vers la meme case => promotion, il faut choisir la piece.
            const variants = legalMoves.filter(move => move.to === square);

            if (variants.length > 1 && variants.every(move => move.promotion)) {
                setPendingPromotion({ from: selected as Square, to: square });

                return;
            }

            onMove(target.from, target.to, target.promotion);
            setSelected(null);

            return;
        }

        const piece = chess.get(square);

        // On ne selectionne que ses propres pieces.
        if (piece && piece.color === myColor) {
            setSelected(prev => (prev === square ? null : square));

            return;
        }

        setSelected(null);
    };

    const confirmPromotion = (promotion: PieceSymbol) => {
        if (!pendingPromotion) {
            return;
        }

        onMove(pendingPromotion.from, pendingPromotion.to, promotion);
        setPendingPromotion(null);
        setSelected(null);
    };

    return (
        <div className="relative flex flex-col items-center">
            <div className="grid grid-cols-8 rounded-md overflow-hidden shadow-lg border-2 border-[#5C5147]">
                {rows.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                        // rowIndex/colIndex suivent l'orientation affichee, la couleur de case
                        // doit rester celle du plateau reel: on la deduit du nom de la case.
                        const square = (cell?.square ??
                            squareFromDisplay(rowIndex, colIndex, myColor)) as Square;
                        const isDark = isDarkSquare(square);
                        const move = targets.get(square);

                        return (
                            <button
                                key={square}
                                type="button"
                                aria-label={
                                    cell ? `${PIECE_LABELS[cell.type]} en ${square}` : `Case ${square}`
                                }
                                onClick={() => handleSquareClick(square)}
                                className={clsx('relative flex items-center justify-center w-[44px] h-[44px]', {
                                    'bg-[#B58863]': isDark,
                                    'bg-[#F0D9B5]': !isDark,
                                    'cursor-default': !interactive,
                                })}
                            >
                                {square === kingInCheckSquare && (
                                    <span className="absolute inset-0 bg-red-500/50" />
                                )}
                                {square === selected && (
                                    <span className="absolute inset-0 bg-[#F7EC74]/70" />
                                )}

                                {cell && <ZchecsPiece type={cell.type} color={cell.color} />}

                                {move && !cell && (
                                    <span className="absolute w-3.5 h-3.5 rounded-full bg-black/35" />
                                )}
                                {move && cell && (
                                    <span className="absolute inset-0.5 rounded-full ring-4 ring-black/35" />
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            {pendingPromotion && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-md">
                    <p className="text-white text-sm mb-3">Promotion</p>
                    <div className="flex gap-3">
                        {PROMOTION_CHOICES.map(type => (
                            <button
                                key={type}
                                type="button"
                                aria-label={PIECE_LABELS[type]}
                                onClick={() => confirmPromotion(type)}
                            >
                                <ZchecsPiece type={type} color={myColor} className="w-11 h-11 text-xl" />
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="mt-4 text-xs text-gray-300 underline"
                        onClick={() => setPendingPromotion(null)}
                    >
                        Annuler
                    </button>
                </div>
            )}
        </div>
    );
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

/** Nom de la case pour une position affichee, en tenant compte de l'orientation. */
const squareFromDisplay = (rowIndex: number, colIndex: number, myColor: ZchecsColor): string => {
    const file = myColor === 'b' ? FILES[7 - colIndex] : FILES[colIndex];
    const rank = myColor === 'b' ? rowIndex + 1 : 8 - rowIndex;

    return `${file}${rank}`;
};

const isDarkSquare = (square: string): boolean => {
    const file = FILES.indexOf(square[0]);
    const rank = Number(square[1]) - 1;

    return (file + rank) % 2 === 0;
};
