import { Chess } from 'chess.js';
import { allRepliesLose, canForceMate } from '../chess/mate';
import { fenTurn } from '../chess/fen';
import type { Color, MoveInput } from '../chess/types';
import type { Challenge, ChallengeTier } from '../domain/types';

// Regras do Modo Desafio, independentes de interface.

export const normalizeSan = (san: string) => san.replace(/[+#!?]/g, '');

export function challengePlayerColor(c: Challenge): Color {
  return fenTurn(c.fen);
}

/** Quantos lances o jogador precisa fazer. */
export function challengePlayerMoves(c: Challenge): number {
  return c.mateIn ?? Math.ceil(c.solution.length / 2);
}

export interface AttemptResult {
  correct: boolean;
  /** SAN do lance do jogador, quando legal. */
  san: string | null;
  solved: boolean;
  /** Resposta do adversário (SAN) quando o desafio continua. */
  reply: string | null;
}

/**
 * Avalia um lance do jogador.
 * @param fen posição atual
 * @param played lances já feitos no desafio (SAN, jogador e adversário)
 */
export function evaluateAttempt(challenge: Challenge, fen: string, played: string[], move: MoveInput): AttemptResult {
  const chess = new Chess(fen);
  let san: string;
  try {
    san = chess.move(move).san;
  } catch {
    return { correct: false, san: null, solved: false, reply: null };
  }
  const ply = played.length;
  const onMainLine = played.every((m, i) => normalizeSan(m) === normalizeSan(challenge.solution[i] ?? ''));
  const scripted = onMainLine ? challenge.solution[ply] : undefined;

  let correct: boolean;
  let solved: boolean;
  if (challenge.mateIn) {
    // Desafios de mate aceitam qualquer lance que mantenha o mate no prazo.
    const movesLeft = challenge.mateIn - ply / 2 - 1;
    solved = chess.isCheckmate();
    correct = solved || (movesLeft > 0 && allRepliesLose(chess, movesLeft));
  } else {
    correct = !!scripted && normalizeSan(scripted) === normalizeSan(san);
    solved = correct && ply === challenge.solution.length - 1;
  }
  if (!correct) return { correct: false, san, solved: false, reply: null };
  if (solved) return { correct: true, san, solved: true, reply: null };

  // Resposta do adversário: a da linha principal, se couber; senão, qualquer lance legal.
  let reply: string | null = null;
  const scriptedReply =
    onMainLine && scripted && normalizeSan(scripted) === normalizeSan(san) ? challenge.solution[ply + 1] : undefined;
  if (scriptedReply) {
    try {
      reply = chess.move(scriptedReply).san;
    } catch {
      reply = null;
    }
  }
  if (!reply) reply = chess.moves()[0] ?? null;
  return { correct: true, san, solved: false, reply };
}

// ───────────────────────── Progressão por grupos ─────────────────────────

export function isTierUnlocked(
  tier: ChallengeTier,
  tiers: ChallengeTier[],
  challenges: Challenge[],
  solved: Record<string, string>,
): boolean {
  if (tier.unlockAfter <= 0) return true;
  const idx = tiers.findIndex((t) => t.tier === tier.tier);
  const previous = tiers[idx - 1];
  if (!previous) return true;
  const done = challenges.filter((c) => c.tier === previous.tier && solved[c.id]).length;
  return done >= tier.unlockAfter;
}

/** Desafio do dia: muda à meia-noite, igual para todo mundo. */
export function dailyChallenge(challenges: Challenge[], date: string): Challenge | null {
  const pool = challenges.filter((c) => c.source === 'liga' && !c.timeLimitSec);
  if (pool.length === 0) return null;
  const day = date.slice(0, 10);
  let hash = 0;
  for (const ch of day) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[hash % pool.length];
}

// ───────────────────────── Desafios criados no Laboratório ─────────────────────────

export interface ChallengeDraft {
  title: string;
  prompt: string;
  fen: string;
  /** Solução demonstrada pelo professor (SAN). */
  solution: string[];
  authorName: string;
}

/** Monta um desafio a partir de uma posição + solução jogada no Laboratório. */
export function buildCustomChallenge(draft: ChallengeDraft, id: string): Challenge | { error: string } {
  if (draft.solution.length === 0) return { error: 'Jogue a solução no tabuleiro antes de salvar.' };
  const chess = new Chess(draft.fen);
  const sans: string[] = [];
  for (const m of draft.solution) {
    try {
      sans.push(chess.move(m).san);
    } catch {
      return { error: 'A solução tem um lance inválido.' };
    }
  }
  // A solução termina sempre num lance de quem resolve.
  const solution = sans.length % 2 === 0 ? sans.slice(0, -1) : sans;
  const playerMoves = Math.ceil(solution.length / 2);
  const endsInMate = solution[solution.length - 1].includes('#');
  const forced = endsInMate && playerMoves <= 3 && canForceMate(new Chess(draft.fen), playerMoves);
  const side = fenTurn(draft.fen) === 'w' ? 'Brancas' : 'Pretas';
  return {
    id,
    type: forced ? (`mate-${playerMoves}` as Challenge['type']) : 'best-move',
    title: draft.title.trim() || 'Desafio sem nome',
    prompt: draft.prompt.trim() || `${side} jogam. ${forced ? `Mate em ${playerMoves}.` : 'Encontre o melhor lance.'}`,
    fen: draft.fen,
    solution,
    mateIn: forced ? playerMoves : undefined,
    tier: 0,
    xp: 20 + 10 * playerMoves,
    hint: `Comece olhando para a peça em ${solutionFirstSquare(draft.fen, solution[0])}.`,
    successText: 'Boa! Você encontrou a solução.',
    failText: 'Quase. Olhe a posição de novo, com calma.',
    source: 'professor',
    authorName: draft.authorName,
  };
}

function solutionFirstSquare(fen: string, san: string): string {
  try {
    return new Chess(fen).move(san).from;
  } catch {
    return 'jogo';
  }
}
