'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { ChessGame } from '@/core/chess/game';
import { START_FEN, type Color, type GameSnapshot, type MoveInput, type MoveRecord } from '@/core/chess/types';

/** Liga uma ChessGame (regras puras) ao estado do React. */
export function useChessGame(initialFen: string = START_FEN, initialMoves: string[] = []) {
  const gameRef = useRef<ChessGame | null>(null);
  if (!gameRef.current) gameRef.current = ChessGame.fromMoves(initialFen, initialMoves);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(() => gameRef.current!.snapshot());

  const sync = useCallback(() => {
    const s = gameRef.current!.snapshot();
    setSnapshot(s);
    return s;
  }, []);

  const api = useMemo(
    () => ({
      move(input: MoveInput | string): MoveRecord | null {
        const record = gameRef.current!.move(input);
        if (record) sync();
        return record;
      },
      undo(plies = 1) {
        gameRef.current!.undo(plies);
        return sync();
      },
      resign(color: Color) {
        gameRef.current!.resign(color);
        return sync();
      },
      reset(fen?: string) {
        gameRef.current!.reset(fen);
        return sync();
      },
      load(fen: string, moves: string[] = []) {
        gameRef.current = ChessGame.fromMoves(fen, moves);
        return sync();
      },
      legalTargets: (from: string) => gameRef.current!.legalTargets(from),
      needsPromotion: (from: string, to: string) => gameRef.current!.needsPromotion(from, to),
      sans: () => gameRef.current!.sans(),
      fen: () => gameRef.current!.fen,
    }),
    [sync],
  );

  return { snapshot, ...api };
}

export type ChessGameApi = ReturnType<typeof useChessGame>;
