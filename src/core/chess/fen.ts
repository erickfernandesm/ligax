import { Chess, validateFen } from 'chess.js';
import {
  ALL_SQUARES,
  FILES,
  type BoardMap,
  type Color,
  type PieceCode,
  type Square,
  makePiece,
  pieceColor,
  pieceType,
  type PieceType,
} from './types';

/** Lê o campo de peças de um FEN (ou um FEN completo) para um mapa casa → peça. */
export function fenToBoard(fen: string): BoardMap {
  const placement = fen.trim().split(/\s+/)[0] ?? '';
  const board: BoardMap = {};
  const rows = placement.split('/');
  rows.forEach((row, i) => {
    const rank = 8 - i;
    let file = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) {
        file += Number(ch);
      } else {
        const color: Color = ch === ch.toUpperCase() ? 'w' : 'b';
        const type = ch.toLowerCase() as PieceType;
        if (file < 8 && 'kqrbnp'.includes(type)) board[FILES[file] + rank] = makePiece(color, type);
        file += 1;
      }
    }
  });
  return board;
}

export function boardToPlacement(board: BoardMap): string {
  const rows: string[] = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '';
    let empty = 0;
    for (const f of FILES) {
      const p = board[f + rank];
      if (!p) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      const t = pieceType(p);
      row += pieceColor(p) === 'w' ? t.toUpperCase() : t;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

/** Direitos de roque deduzidos da posição: rei e torre nas casas iniciais. */
function inferCastling(board: BoardMap): string {
  let c = '';
  if (board.e1 === 'wK') {
    if (board.h1 === 'wR') c += 'K';
    if (board.a1 === 'wR') c += 'Q';
  }
  if (board.e8 === 'bK') {
    if (board.h8 === 'bR') c += 'k';
    if (board.a8 === 'bR') c += 'q';
  }
  return c || '-';
}

export function boardToFen(board: BoardMap, turn: Color, castling?: string): string {
  return `${boardToPlacement(board)} ${turn} ${castling ?? inferCastling(board)} - 0 1`;
}

export function fenTurn(fen: string): Color {
  return fen.trim().split(/\s+/)[1] === 'b' ? 'b' : 'w';
}

export interface PositionCheck {
  ok: boolean;
  /** Mensagens em português, prontas para a interface. */
  errors: string[];
  fen: string;
}

/**
 * Valida se uma posição montada no editor pode virar uma partida de verdade.
 * Com allowFinished, aceita posições em que o jogo já acabou (útil na análise).
 */
export function checkPosition(board: BoardMap, turn: Color, opts: { allowFinished?: boolean } = {}): PositionCheck {
  const errors: string[] = [];
  const pieces = Object.entries(board) as [Square, PieceCode][];
  const count = (code: PieceCode) => pieces.filter(([, p]) => p === code).length;

  if (count('wK') !== 1) errors.push(count('wK') === 0 ? 'Falta o rei branco.' : 'Só pode haver um rei branco.');
  if (count('bK') !== 1) errors.push(count('bK') === 0 ? 'Falta o rei preto.' : 'Só pode haver um rei preto.');
  if (pieces.some(([sq, p]) => pieceType(p) === 'p' && (sq[1] === '1' || sq[1] === '8'))) {
    errors.push('Peões não podem ficar na primeira nem na última fileira.');
  }

  const fen = boardToFen(board, turn);
  if (errors.length === 0) {
    const v = validateFen(fen);
    if (!v.ok) {
      errors.push('Essa posição não é válida.');
    } else {
      try {
        // O lado que NÃO tem a vez não pode estar em xeque.
        const flipped = new Chess(boardToFen(board, turn === 'w' ? 'b' : 'w', '-'));
        if (flipped.inCheck()) {
          errors.push(
            turn === 'w'
              ? 'O rei preto está em xeque, então a vez tem que ser das pretas.'
              : 'O rei branco está em xeque, então a vez tem que ser das brancas.',
          );
        } else {
          const game = new Chess(fen);
          if (!opts.allowFinished && game.isGameOver()) errors.push('Nessa posição a partida já acabou. Mude alguma peça.');
        }
      } catch {
        errors.push('Essa posição não é válida.');
      }
    }
  }
  return { ok: errors.length === 0, errors, fen };
}

/** Normaliza/valida um FEN digitado. Aceita só o campo de peças também. */
export function parseFenInput(input: string): { board: BoardMap; turn: Color } | null {
  const text = input.trim();
  if (!text) return null;
  const parts = text.split(/\s+/);
  const placement = parts[0];
  const rows = placement.split('/');
  if (rows.length !== 8) return null;
  for (const row of rows) {
    let n = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) n += Number(ch);
      else if (/[kqrbnpKQRBNP]/.test(ch)) n += 1;
      else return null;
    }
    if (n !== 8) return null;
  }
  return { board: fenToBoard(placement), turn: parts[1] === 'b' ? 'b' : 'w' };
}

export function isSquare(s: string): boolean {
  return ALL_SQUARES.includes(s);
}
