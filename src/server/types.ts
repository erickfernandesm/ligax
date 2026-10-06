import type { Color, GameStatus } from '@/core/chess/types';
import type { Challenge, OnlineStats, PlayerProgress, SavedPosition, UserRole } from '@/core/domain/types';

// Formato dos documentos guardados no servidor.

export interface UserRow {
  id: string;
  email: string;
  /** nick */
  name: string;
  role: UserRole;
  avatarColor: string;
  passwordHash: string;
  /** Pontos das partidas online. Só o servidor altera. */
  score: number;
  online: OnlineStats;
  createdAt: string;
}

export interface SessionRow {
  /** sha256 do token que fica no cookie (é também o id do documento) */
  tokenHash: string;
  userId: string;
  expiresAt: number;
}

/** Dados de jogo de uma conta, sincronizados entre aparelhos. */
export interface UserDataRow {
  progress: PlayerProgress | null;
  positions: SavedPosition[];
  customChallenges: Challenge[];
  updatedAt: string;
}

export interface MatchRow {
  id: string;
  hostId: string;
  whiteId: string | null;
  blackId: string | null;
  moves: string[];
  status: 'waiting' | 'playing' | 'finished';
  reason: GameStatus | null;
  winner: Color | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface MediaRow {
  id: string;
  fileName: string;
  originalName: string;
  contentType: string;
  size: number;
  ownerId: string;
  createdAt: string;
}
