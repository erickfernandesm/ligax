import { Chess, type Move } from 'chess.js';
import { fenToBoard } from './fen';
import {
  START_FEN,
  type Color,
  type GameSnapshot,
  type GameStatus,
  type MoveInput,
  type MoveRecord,
  type Square,
  opposite,
} from './types';

function toRecord(m: Move): MoveRecord {
  return {
    san: m.san,
    from: m.from,
    to: m.to,
    color: m.color,
    piece: m.piece,
    captured: m.captured,
    promotion: m.promotion,
    fen: m.after,
    isCheck: m.san.includes('+') || m.san.includes('#'),
    isMate: m.san.includes('#'),
  };
}

/**
 * Partida de xadrez: camada fina sobre o chess.js que expõe um estado imutável
 * (GameSnapshot) para a interface. Sem dependência de UI.
 */
export class ChessGame {
  private chess: Chess;
  private startFen: string;
  private resignedBy: Color | null = null;

  constructor(fen: string = START_FEN) {
    this.startFen = fen;
    this.chess = new Chess(fen);
  }

  /** Recria uma partida a partir do FEN inicial + lances em SAN (para retomar partidas salvas). */
  static fromMoves(startFen: string, sans: string[]): ChessGame {
    const g = new ChessGame(startFen);
    for (const san of sans) {
      try {
        g.chess.move(san);
      } catch {
        break;
      }
    }
    return g;
  }

  get fen(): string {
    return this.chess.fen();
  }

  get turn(): Color {
    return this.chess.turn();
  }

  legalTargets(from: Square): { to: Square; capture: boolean; promotion: boolean }[] {
    if (this.status() !== 'playing') return [];
    const seen = new Map<string, { to: Square; capture: boolean; promotion: boolean }>();
    for (const m of this.chess.moves({ square: from as never, verbose: true })) {
      seen.set(m.to, { to: m.to, capture: !!m.captured, promotion: !!m.promotion });
    }
    return [...seen.values()];
  }

  needsPromotion(from: Square, to: Square): boolean {
    return this.chess
      .moves({ square: from as never, verbose: true })
      .some((m) => m.to === to && !!m.promotion);
  }

  /** Tenta jogar. Retorna o lance ou null se for ilegal. */
  move(input: MoveInput | string): MoveRecord | null {
    if (this.status() !== 'playing') return null;
    try {
      return toRecord(this.chess.move(input as never));
    } catch {
      return null;
    }
  }

  undo(plies = 1): void {
    this.resignedBy = null;
    for (let i = 0; i < plies; i++) this.chess.undo();
  }

  resign(color: Color): void {
    if (this.status() === 'playing') this.resignedBy = color;
  }

  reset(fen: string = this.startFen): void {
    this.startFen = fen;
    this.resignedBy = null;
    this.chess = new Chess(fen);
  }

  status(): GameStatus {
    if (this.resignedBy) return 'resigned';
    if (this.chess.isCheckmate()) return 'checkmate';
    if (this.chess.isStalemate()) return 'stalemate';
    if (this.chess.isInsufficientMaterial()) return 'draw-material';
    if (this.chess.isThreefoldRepetition()) return 'draw-repetition';
    if (this.chess.isDrawByFiftyMoves()) return 'draw-fifty';
    return 'playing';
  }

  sans(): string[] {
    return this.chess.history();
  }

  snapshot(): GameSnapshot {
    const history = this.chess.history({ verbose: true });
    const last = history[history.length - 1];
    const status = this.status();
    const turn = this.chess.turn();
    const inCheck = this.chess.inCheck();
    const board = fenToBoard(this.chess.fen());
    let checkSquare: Square | null = null;
    if (inCheck) {
      const king = turn === 'w' ? 'wK' : 'bK';
      checkSquare = Object.keys(board).find((sq) => board[sq] === king) ?? null;
    }
    let winner: Color | null = null;
    if (status === 'checkmate') winner = opposite(turn);
    if (status === 'resigned' && this.resignedBy) winner = opposite(this.resignedBy);
    return {
      fen: this.chess.fen(),
      startFen: this.startFen,
      turn,
      board,
      moves: history.map(toRecord),
      lastMove: last ? { from: last.from, to: last.to } : null,
      inCheck,
      checkSquare,
      status,
      winner,
    };
  }
}

export const STATUS_LABEL: Record<GameStatus, string> = {
  playing: 'Em andamento',
  checkmate: 'Xeque-mate',
  stalemate: 'Empate por afogamento',
  'draw-repetition': 'Empate por repetição',
  'draw-material': 'Empate por falta de material',
  'draw-fifty': 'Empate pela regra dos 50 lances',
  resigned: 'Desistência',
};

/** Converte "e2e4" / "e7e8q" em MoveInput. */
export function uciToMove(uci: string): MoveInput {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: (uci[4] as MoveInput['promotion']) || undefined,
  };
}
