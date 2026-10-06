'use client';

import { useCallback, useState } from 'react';
import { applyStroke } from '@/core/chess/annotations';
import { fenToBoard, fenTurn } from '@/core/chess/fen';
import {
  NO_ANNOTATIONS,
  START_FEN,
  type Annotations,
  type BoardMap,
  type Color,
  type MarkColor,
  type PieceCode,
  type Square,
} from '@/core/chess/types';

export interface EditorState {
  board: BoardMap;
  turn: Color;
  annotations: Annotations;
}

/** Ferramenta ativa do editor. */
export type Tool = { kind: 'move' } | { kind: 'erase' } | { kind: 'piece'; code: PieceCode };

interface History {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
}

const HISTORY_LIMIT = 100;

export function editorStateFromFen(fen: string, annotations: Annotations = NO_ANNOTATIONS): EditorState {
  return { board: fenToBoard(fen), turn: fenTurn(fen), annotations };
}

/** Estado do editor de posições, com desfazer/refazer. */
export function useEditor(initial: EditorState = editorStateFromFen(START_FEN)) {
  const [history, setHistory] = useState<History>({ past: [], present: initial, future: [] });

  /** Aplica uma alteração e guarda o estado anterior para o "desfazer". */
  const commit = useCallback((update: (s: EditorState) => EditorState) => {
    setHistory((h) => {
      const next = update(h.present);
      if (next === h.present) return h;
      return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      if (h.future.length === 0) return h;
      const [next, ...rest] = h.future;
      return { past: [...h.past, h.present], present: next, future: rest };
    });
  }, []);

  /** Troca tudo de uma vez (abrir posição salva, slide etc.), zerando o histórico. */
  const replace = useCallback((state: EditorState) => setHistory({ past: [], present: state, future: [] }), []);

  const placePiece = useCallback(
    (square: Square, code: PieceCode) =>
      commit((s) => {
        const board = { ...s.board };
        // tocar de novo com a mesma peça remove
        if (board[square] === code) delete board[square];
        else board[square] = code;
        return { ...s, board };
      }),
    [commit],
  );

  const removePiece = useCallback(
    (square: Square) =>
      commit((s) => {
        if (!s.board[square]) return s;
        const board = { ...s.board };
        delete board[square];
        return { ...s, board };
      }),
    [commit],
  );

  const movePiece = useCallback(
    (from: Square, to: Square) =>
      commit((s) => {
        const piece = s.board[from];
        if (!piece || from === to) return s;
        const board = { ...s.board };
        delete board[from];
        board[to] = piece;
        return { ...s, board };
      }),
    [commit],
  );

  const setTurn = useCallback((turn: Color) => commit((s) => (s.turn === turn ? s : { ...s, turn })), [commit]);

  const setBoardFromFen = useCallback(
    (fen: string) => commit((s) => ({ ...s, board: fenToBoard(fen), turn: fenTurn(fen), annotations: NO_ANNOTATIONS })),
    [commit],
  );

  const stroke = useCallback(
    (from: Square, to: Square, color: MarkColor) =>
      commit((s) => ({ ...s, annotations: applyStroke(s.annotations, from, to, color) })),
    [commit],
  );

  const clearMarks = useCallback(
    () => commit((s) => (s.annotations.squares.length + s.annotations.arrows.length ? { ...s, annotations: NO_ANNOTATIONS } : s)),
    [commit],
  );

  return {
    state: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    replace,
    placePiece,
    removePiece,
    movePiece,
    setTurn,
    setBoardFromFen,
    stroke,
    clearMarks,
  };
}

export type Editor = ReturnType<typeof useEditor>;
