'use client';

import { Chess } from 'chess.js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChessGame } from '@/core/chess/game';
import type { MoveInput, MoveRecord } from '@/core/chess/types';
import { summarizeEval, type EngineLine } from '@/core/engine';
import { getEngine } from '@/services/engine';

export interface AnalysisLine {
  /** Primeiros lances da linha, em SAN. */
  sans: string[];
  firstMove: MoveInput | null;
}

/** Converte a linha da engine (UCI) em lances legíveis (SAN). */
function toSan(fen: string, pv: string[], max = 6): AnalysisLine {
  const chess = new Chess(fen);
  const sans: string[] = [];
  let firstMove: MoveInput | null = null;
  for (const uci of pv.slice(0, max)) {
    try {
      const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!firstMove) firstMove = { from: m.from, to: m.to, promotion: m.promotion as MoveInput['promotion'] };
      sans.push(m.san);
    } catch {
      break;
    }
  }
  return { sans, firstMove };
}

/**
 * Modo análise: lances livres para os dois lados, voltar/avançar pela linha
 * jogada e, para a posição atual, UMA avaliação com a melhor linha da engine.
 */
export function useAnalysis(startFen: string | null, engineOn: boolean, initialMoves: string[] = []) {
  const [line, setLine] = useState<MoveRecord[]>([]);
  const [cursor, setCursor] = useState(0);
  const [engineLine, setEngineLine] = useState<EngineLine | null>(null);
  const [engineName, setEngineName] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  // posição nova → zera a linha (ou carrega os lances salvos junto com a posição)
  useEffect(() => {
    if (!startFen) return;
    const game = ChessGame.fromMoves(startFen, initialMoves);
    const moves = game.snapshot().moves;
    setLine(moves);
    setCursor(moves.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startFen]);

  const fen = startFen ? (cursor === 0 ? startFen : line[cursor - 1]?.fen ?? startFen) : null;
  const position = useMemo(() => (fen ? new ChessGame(fen) : null), [fen]);
  const snapshot = useMemo(() => position?.snapshot() ?? null, [position]);
  const lastMove = cursor > 0 && line[cursor - 1] ? { from: line[cursor - 1].from, to: line[cursor - 1].to } : null;

  const move = useCallback(
    (input: MoveInput): MoveRecord | null => {
      if (!fen) return null;
      const record = new ChessGame(fen).move(input);
      if (!record) return null;
      // jogar no meio da linha substitui a continuação: é assim que se testa outra ideia
      setLine((l) => [...l.slice(0, cursor), record]);
      setCursor(cursor + 1);
      return record;
    },
    [fen, cursor],
  );

  const goTo = useCallback((ply: number) => setCursor(Math.max(0, Math.min(line.length, ply))), [line.length]);

  // ── engine: uma linha só (a melhor) ──
  useEffect(() => {
    setEngineLine(null);
    if (!fen || !engineOn || new Chess(fen).isGameOver()) {
      setThinking(false);
      return;
    }
    let alive = true;
    setThinking(true);
    void getEngine().then((engine) => {
      if (!alive) return;
      setEngineName(engine.name);
      void engine
        .search(fen, { depth: 16, moveTimeMs: 1500, multiPv: 1 }, (lines) => {
          if (alive && lines[0]) setEngineLine(lines[0]);
        })
        .then((result) => {
          if (!alive) return;
          if (result.lines[0]) setEngineLine(result.lines[0]);
          setThinking(false);
        });
    });
    return () => {
      alive = false;
      void getEngine().then((e) => e.stop());
    };
  }, [fen, engineOn]);

  const evaluation = useMemo(() => summarizeEval(engineLine ?? undefined), [engineLine]);
  const bestLine = useMemo<AnalysisLine | null>(
    () => (fen && engineLine ? toSan(fen, engineLine.pv) : null),
    [engineLine, fen],
  );

  return {
    fen,
    position,
    snapshot,
    line,
    cursor,
    lastMove,
    move,
    goTo,
    sans: line.slice(0, cursor).map((m) => m.san),
    evaluation,
    bestLine,
    depth: engineLine?.depth ?? 0,
    engineName,
    thinking,
  };
}

export type Analysis = ReturnType<typeof useAnalysis>;
