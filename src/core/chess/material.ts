import { type BoardMap, type Color, type PieceType, pieceColor, pieceType } from './types';

export const PIECE_VALUE: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const START_COUNT: Record<PieceType, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
const ORDER: PieceType[] = ['q', 'r', 'b', 'n', 'p'];

export interface MaterialInfo {
  /** Peças que cada lado perdeu (capturadas pelo adversário). */
  lost: Record<Color, PieceType[]>;
  /** Vantagem material das brancas em pontos (negativo = pretas na frente). */
  balance: number;
}

/** Calcula material a partir da posição (funciona também para posições montadas). */
export function materialInfo(board: BoardMap): MaterialInfo {
  const counts: Record<Color, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };
  for (const p of Object.values(board)) counts[pieceColor(p)][pieceType(p)]++;
  const lost: Record<Color, PieceType[]> = { w: [], b: [] };
  let balance = 0;
  for (const c of ['w', 'b'] as Color[]) {
    for (const t of ORDER) {
      const missing = Math.max(0, START_COUNT[t] - counts[c][t]);
      for (let i = 0; i < missing; i++) lost[c].push(t);
      balance += (c === 'w' ? 1 : -1) * counts[c][t] * PIECE_VALUE[t];
    }
  }
  return { lost, balance };
}
