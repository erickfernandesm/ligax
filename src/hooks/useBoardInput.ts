'use client';

import { useCallback, useEffect, useState } from 'react';
import type { BoardTarget } from '@/components/board/ChessBoard';
import { type BoardMap, type Color, type MoveInput, type PieceCode, type Square, pieceColor } from '@/core/chess/types';

interface Options {
  board: BoardMap;
  /** Cor que pode jogar agora. null desliga a interação. */
  movable: Color | 'both' | null;
  getTargets: (from: Square) => { to: Square; capture: boolean }[];
  needsPromotion: (from: Square, to: Square) => boolean;
  onMove: (move: MoveInput) => void;
}

/**
 * Interação padrão de jogo, compartilhada por Partida, Ensino, Desafio e
 * Análise: tocar na peça → ver destinos → tocar no destino (ou arrastar),
 * com escolha de promoção.
 */
export function useBoardInput({ board, movable, getTargets, needsPromotion, onMove }: Options) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<BoardTarget[]>([]);
  const [promotion, setPromotion] = useState<{ from: Square; to: Square; color: Color } | null>(null);

  const clear = useCallback(() => {
    setSelected(null);
    setTargets([]);
  }, []);

  // Posição mudou (lance feito, posição nova): limpa a seleção.
  useEffect(() => {
    clear();
  }, [board, clear]);

  useEffect(() => {
    if (movable === null) {
      clear();
      setPromotion(null);
    }
  }, [movable, clear]);

  const isMine = useCallback(
    (piece: PieceCode | undefined) => !!piece && movable !== null && (movable === 'both' || pieceColor(piece) === movable),
    [movable],
  );

  const select = useCallback(
    (square: Square) => {
      setSelected(square);
      setTargets(getTargets(square));
    },
    [getTargets],
  );

  const attempt = useCallback(
    (from: Square, to: Square) => {
      const piece = board[from];
      if (!piece) return;
      if (needsPromotion(from, to)) {
        setPromotion({ from, to, color: pieceColor(piece) });
        clear();
        return;
      }
      clear();
      onMove({ from, to });
    },
    [board, needsPromotion, onMove, clear],
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (movable === null) return;
      if (selected && targets.some((t) => t.to === square)) return attempt(selected, square);
      if (selected === square) return clear();
      if (isMine(board[square])) return select(square);
      clear();
    },
    [movable, selected, targets, board, attempt, clear, isMine, select],
  );

  const onPieceDrop = useCallback(
    (from: Square, to: Square) => {
      if (!isMine(board[from])) return;
      if (getTargets(from).some((t) => t.to === to)) attempt(from, to);
      else clear();
    },
    [board, isMine, getTargets, attempt, clear],
  );

  const choosePromotion = useCallback(
    (piece: NonNullable<MoveInput['promotion']>) => {
      if (!promotion) return;
      const { from, to } = promotion;
      setPromotion(null);
      onMove({ from, to, promotion: piece });
    },
    [promotion, onMove],
  );

  return {
    boardProps: {
      selected,
      targets,
      onSquareClick: movable === null ? undefined : onSquareClick,
      onPieceDrop: movable === null ? undefined : onPieceDrop,
      onDragStart: select,
      canDrag: (_: Square, piece: PieceCode) => isMine(piece),
    },
    promotion,
    choosePromotion,
    cancelPromotion: () => setPromotion(null),
    clear,
  };
}
