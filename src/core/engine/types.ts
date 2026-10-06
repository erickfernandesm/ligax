// Contrato único de engine. A interface usa só esta abstração; trocar de
// engine (Stockfish WASM, engine nativa num app, API remota) não afeta o resto.

export interface EngineLimits {
  /** Profundidade máxima de busca. */
  depth?: number;
  /** Tempo máximo pensando, em ms. */
  moveTimeMs?: number;
  /** Nível de força 0–20 (Skill Level do Stockfish). */
  skillLevel?: number;
  /** Quantas variantes devolver (análise). */
  multiPv?: number;
}

export interface EngineLine {
  /** 1 = melhor variante. */
  rank: number;
  depth: number;
  /** Avaliação em centipeões do ponto de vista das brancas. */
  scoreCp: number | null;
  /** Mate em N (positivo = brancas dão mate, negativo = pretas). */
  mateIn: number | null;
  /** Lances em UCI ("e2e4"). */
  pv: string[];
}

export interface EngineResult {
  /** Melhor lance em UCI, ou null se não houver lance legal. */
  bestMove: string | null;
  lines: EngineLine[];
}

export interface ChessEngine {
  readonly name: string;
  init(): Promise<void>;
  /** Busca na posição. Uma nova busca cancela a anterior. */
  search(fen: string, limits: EngineLimits, onUpdate?: (lines: EngineLine[]) => void): Promise<EngineResult>;
  stop(): void;
  dispose(): void;
}
