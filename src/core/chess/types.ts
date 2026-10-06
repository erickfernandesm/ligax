// Tipos básicos de xadrez. Este módulo (e todo o /core) é TypeScript puro:
// sem React, sem DOM — pode ser reutilizado num app React Native/Expo.

export type Color = 'w' | 'b';
export type PieceType = 'k' | 'q' | 'r' | 'b' | 'n' | 'p';
/** Ex.: "wK", "bP". */
export type PieceCode = `${Color}${Uppercase<PieceType>}`;
/** Ex.: "e4". */
export type Square = string;
export type BoardMap = Record<Square, PieceCode>;

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;
export const ALL_SQUARES: Square[] = RANKS.flatMap((r) => FILES.map((f) => f + r));

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const EMPTY_FEN = '8/8/8/8/8/8/8/8 w - - 0 1';

/** Semântica das marcações: boa jogada, perigo, atenção, ideia. */
export type MarkColor = 'good' | 'bad' | 'warn' | 'idea';

export interface SquareMark {
  square: Square;
  color: MarkColor;
}

export interface ArrowMark {
  from: Square;
  to: Square;
  color: MarkColor;
}

export interface Annotations {
  squares: SquareMark[];
  arrows: ArrowMark[];
}

export const NO_ANNOTATIONS: Annotations = { squares: [], arrows: [] };

export interface MoveInput {
  from: Square;
  to: Square;
  promotion?: 'q' | 'r' | 'b' | 'n';
}

export interface MoveRecord {
  san: string;
  from: Square;
  to: Square;
  color: Color;
  piece: PieceType;
  captured?: PieceType;
  promotion?: PieceType;
  /** FEN depois do lance. */
  fen: string;
  isCheck: boolean;
  isMate: boolean;
}

export type GameStatus =
  | 'playing'
  | 'checkmate'
  | 'stalemate'
  | 'draw-repetition'
  | 'draw-material'
  | 'draw-fifty'
  | 'resigned';

export interface GameSnapshot {
  fen: string;
  startFen: string;
  turn: Color;
  board: BoardMap;
  moves: MoveRecord[];
  lastMove: { from: Square; to: Square } | null;
  inCheck: boolean;
  checkSquare: Square | null;
  status: GameStatus;
  /** Vencedor, quando houver. null = em andamento ou empate. */
  winner: Color | null;
}

export const opposite = (c: Color): Color => (c === 'w' ? 'b' : 'w');
export const pieceColor = (p: PieceCode): Color => p[0] as Color;
export const pieceType = (p: PieceCode): PieceType => p[1].toLowerCase() as PieceType;
export const makePiece = (c: Color, t: PieceType): PieceCode => `${c}${t.toUpperCase()}` as PieceCode;

export const PIECE_NAMES: Record<PieceType, string> = {
  k: 'Rei',
  q: 'Dama',
  r: 'Torre',
  b: 'Bispo',
  n: 'Cavalo',
  p: 'Peão',
};
