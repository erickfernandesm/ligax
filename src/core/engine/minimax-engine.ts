import { Chess, type Move } from 'chess.js';
import type { ChessEngine, EngineLimits, EngineLine, EngineResult } from './types';

// Engine de reserva em TypeScript puro (alfa-beta + material + tabelas de casa).
// Entra em ação quando o Stockfish não puder ser carregado (browser antigo,
// app sem WASM, testes em Node). Bem mais fraca, mas joga xadrez de verdade.

const VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

// Tabelas do ponto de vista das brancas, da 8ª fileira (índice 0) à 1ª.
const PST: Record<string, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  n: [
    -50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15,
    20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  b: [
    -20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10,
    5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10,
    -10, -10, -10, -10, -10, -20,
  ],
  r: [
    0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0,
    0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0,
  ],
  q: [
    -20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0,
    -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10,
    -10, -20,
  ],
  k: [
    -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40,
    -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20,
    -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

const MATE = 100000;

/** Avaliação estática do ponto de vista das brancas, em centipeões. */
export function evaluate(chess: Chess): number {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (!p) continue;
      const idx = p.color === 'w' ? r * 8 + f : (7 - r) * 8 + f;
      const v = VALUE[p.type] + PST[p.type][idx];
      score += p.color === 'w' ? v : -v;
    }
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  const key = (m: Move) =>
    (m.captured ? 10 * VALUE[m.captured] - VALUE[m.piece] : 0) + (m.promotion ? 800 : 0) + (m.san.includes('+') ? 50 : 0);
  return moves.sort((a, b) => key(b) - key(a));
}

function negamax(chess: Chess, depth: number, alpha: number, beta: number, ply: number, deadline: number): number {
  if (chess.isCheckmate()) return -MATE + ply;
  if (chess.isDraw() || chess.isStalemate()) return 0;
  if (depth === 0 || Date.now() > deadline) {
    const e = evaluate(chess);
    return chess.turn() === 'w' ? e : -e;
  }
  let best = -Infinity;
  for (const m of orderMoves(chess.moves({ verbose: true }))) {
    chess.move(m);
    const score = -negamax(chess, depth - 1, -beta, -alpha, ply + 1, deadline);
    chess.undo();
    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }
  return best;
}

export class MinimaxEngine implements ChessEngine {
  readonly name = 'Liga X JS';
  private token = 0;

  async init(): Promise<void> {}

  search(fen: string, limits: EngineLimits, onUpdate?: (lines: EngineLine[]) => void): Promise<EngineResult> {
    const token = ++this.token;
    return new Promise((resolve) => {
      // cede a thread antes de pensar, para a interface conseguir mostrar "pensando..."
      setTimeout(() => {
        if (token !== this.token) return resolve({ bestMove: null, lines: [] });
        const result = this.compute(fen, limits);
        onUpdate?.(result.lines);
        resolve(result);
      }, 0);
    });
  }

  stop(): void {
    this.token++;
  }

  dispose(): void {
    this.token++;
  }

  private compute(fen: string, limits: EngineLimits): EngineResult {
    const chess = new Chess(fen);
    const whiteToMove = chess.turn() === 'w';
    const moves = orderMoves(chess.moves({ verbose: true }));
    if (moves.length === 0) return { bestMove: null, lines: [] };
    const skill = limits.skillLevel ?? 20;
    const depth = Math.max(1, Math.min(3, limits.depth ?? 2, skill < 4 ? 1 : skill < 12 ? 2 : 3));
    const deadline = Date.now() + Math.min(limits.moveTimeMs ?? 1500, 2500);

    const scored = moves.map((m) => {
      chess.move(m);
      const score = -negamax(chess, depth - 1, -Infinity, Infinity, 1, deadline);
      chess.undo();
      return { m, score };
    });
    scored.sort((a, b) => b.score - a.score);

    // Níveis baixos escolhem entre os melhores lances com alguma folga.
    const margin = skill >= 16 ? 0 : (20 - skill) * 8;
    const pool = scored.filter((s) => s.score >= scored[0].score - margin);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const uci = (m: Move) => m.from + m.to + (m.promotion ?? '');

    const lines: EngineLine[] = scored.slice(0, Math.max(1, limits.multiPv ?? 1)).map((s, i) => {
      const isMate = Math.abs(s.score) > MATE - 100;
      const stm = whiteToMove ? 1 : -1;
      return {
        rank: i + 1,
        depth,
        scoreCp: isMate ? null : s.score * stm,
        mateIn: isMate ? Math.ceil((MATE - Math.abs(s.score)) / 2) * Math.sign(s.score) * stm : null,
        pv: [uci(s.m)],
      };
    });
    return { bestMove: uci(pick.m), lines };
  }
}
