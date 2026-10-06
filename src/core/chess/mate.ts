import { Chess } from 'chess.js';

const isCheckSan = (san: string) => san.includes('+') || san.includes('#');

/**
 * O lado que tem a vez consegue forçar mate em até `n` lances?
 * Busca exaustiva — use só para n pequeno (desafios de mate em 1, 2 e 3).
 */
export function canForceMate(chess: Chess, n: number): boolean {
  if (n <= 0) return false;
  const moves = chess.moves();
  if (moves.some((m) => m.includes('#'))) return true;
  if (n === 1) return false;
  // Xeques primeiro: acha o mate bem mais rápido.
  moves.sort((a, b) => Number(isCheckSan(b)) - Number(isCheckSan(a)));
  for (const m of moves) {
    chess.move(m);
    const ok = allRepliesLose(chess, n - 1);
    chess.undo();
    if (ok) return true;
  }
  return false;
}

/** Depois de um lance do atacante: toda resposta do defensor ainda leva mate em até `n`? */
export function allRepliesLose(chess: Chess, n: number): boolean {
  if (chess.isCheckmate()) return true;
  const replies = chess.moves();
  if (replies.length === 0) return false; // afogamento
  if (chess.isDraw()) return false;
  for (const r of replies) {
    chess.move(r);
    const ok = canForceMate(chess, n);
    chess.undo();
    if (!ok) return false;
  }
  return true;
}

/** O lance, jogado em `fen`, mantém um mate forçado em até `n` lances (contando este)? */
export function moveKeepsMate(
  fen: string,
  move: { from: string; to: string; promotion?: string },
  n: number,
): boolean {
  const chess = new Chess(fen);
  try {
    chess.move(move);
  } catch {
    return false;
  }
  return allRepliesLose(chess, n - 1);
}
