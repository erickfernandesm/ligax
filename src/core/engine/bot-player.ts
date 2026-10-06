import { Chess } from 'chess.js';
import type { ChessEngine } from './types';

/** Parâmetros de força de um bot. Todos os bots usam a mesma engine. */
export interface BotEngineConfig {
  /** Skill Level da engine, 0–20. */
  skillLevel: number;
  /** Profundidade máxima de busca. */
  depth: number;
  /** Tempo máximo de cálculo, em ms. */
  moveTimeMs: number;
  /** Chance (0–1) de jogar um lance qualquer em vez do melhor — o "descuido". */
  blunderChance: number;
  /** Tempo mínimo "pensando" para a jogada não sair instantânea, em ms. */
  minThinkMs: number;
}

export type Rng = () => number;

/**
 * Escolhe o lance do bot. Devolve UCI ("e2e4") ou null se não houver lance.
 * A personalidade de jogo vem da config; a engine é sempre a mesma.
 */
export async function chooseBotMove(
  engine: ChessEngine,
  fen: string,
  config: BotEngineConfig,
  rng: Rng = Math.random,
): Promise<string | null> {
  const chess = new Chess(fen);
  const legal = chess.moves({ verbose: true });
  if (legal.length === 0) return null;
  const uci = (m: (typeof legal)[number]) => m.from + m.to + (m.promotion ?? '');
  if (legal.length === 1) return uci(legal[0]);

  if (rng() < config.blunderChance) {
    // Descuido: um lance qualquer, mas sem recusar um mate em 1 de graça.
    const mate = legal.find((m) => m.san.includes('#'));
    return uci(mate ?? legal[Math.floor(rng() * legal.length)]);
  }

  const result = await engine.search(fen, {
    skillLevel: config.skillLevel,
    depth: config.depth,
    moveTimeMs: config.moveTimeMs,
  });
  const best = result.bestMove;
  if (best && legal.some((m) => uci(m) === best)) return best;
  // Segurança: se a engine falhar, o bot ainda joga um lance legal.
  return uci(legal[Math.floor(rng() * legal.length)]);
}
