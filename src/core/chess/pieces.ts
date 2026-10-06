import type { BoardMap, PieceCode, Square } from './types';

export interface TrackedPiece {
  id: number;
  code: PieceCode;
  square: Square;
}

const dist = (a: Square, b: Square) =>
  Math.abs(a.charCodeAt(0) - b.charCodeAt(0)) + Math.abs(Number(a[1]) - Number(b[1]));

/**
 * Mantém a identidade das peças entre duas posições para que a interface consiga
 * animar o deslocamento (a peça "anda" em vez de sumir e reaparecer).
 */
export function reconcilePieces(prev: TrackedPiece[], next: BoardMap, nextId: () => number): TrackedPiece[] {
  const result: TrackedPiece[] = [];
  const remaining = new Map<Square, PieceCode>(Object.entries(next) as [Square, PieceCode][]);
  const orphans: TrackedPiece[] = [];

  // 1. Peças que não se mexeram.
  for (const p of prev) {
    if (remaining.get(p.square) === p.code) {
      result.push(p);
      remaining.delete(p.square);
    } else {
      orphans.push(p);
    }
  }
  // 2. Peças que mudaram de casa: casa com a mais próxima do mesmo tipo.
  for (const [square, code] of remaining) {
    let best = -1;
    let bestD = Infinity;
    orphans.forEach((o, i) => {
      const same = o.code === code;
      // promoção: o peão vira outra peça na última fileira
      const promo =
        o.code[1] === 'P' &&
        o.code[0] === code[0] &&
        (square[1] === '8' || square[1] === '1') &&
        dist(o.square, square) <= 2;
      if (!same && !promo) return;
      const d = dist(o.square, square) + (same ? 0 : 0.5);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0) {
      const [o] = orphans.splice(best, 1);
      result.push({ id: o.id, code, square });
    } else {
      result.push({ id: nextId(), code, square });
    }
  }
  return result;
}
