import { ONLINE_MIN_PLIES_FOR_SCORE, ONLINE_SCORE } from '@/content/progression';
import { ChessGame } from '@/core/chess/game';
import { START_FEN, type Color, type MoveInput } from '@/core/chess/types';
import type { FriendMatch, FriendPlayer } from '@/core/domain/types';
import { HttpError } from './auth';
import { getStore, type Store } from './store';
import type { MatchRow, UserRow } from './types';

// Partidas online entre duas contas. O servidor é quem manda: valida a vez e
// a legalidade de cada lance com as mesmas regras do cliente (core/chess) e é
// o único que mexe no Score.

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I: fácil de ditar
const WEEK_MS = 7 * 24 * 3600 * 1000;

async function newCode(store: Store): Promise<string> {
  for (;;) {
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    if (!(await store.get('matches', code))) return code;
  }
}

async function player(store: Store, id: string | null): Promise<FriendPlayer | null> {
  if (!id) return null;
  const u = await store.get<UserRow>('users', id);
  return u ? { id: u.id, name: u.name, avatarColor: u.avatarColor } : { id, name: 'Jogador', avatarColor: '#595c4e' };
}

export async function toView(m: MatchRow): Promise<FriendMatch> {
  const store = await getStore();
  return {
    id: m.id,
    white: await player(store, m.whiteId),
    black: await player(store, m.blackId),
    hostId: m.hostId,
    status: m.status,
    moves: m.moves,
    reason: m.reason,
    winner: m.winner,
    version: m.version,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

export async function getMatch(id: string): Promise<MatchRow> {
  const match = await (await getStore()).get<MatchRow>('matches', id.toUpperCase());
  if (!match) throw new HttpError(404, 'Partida não encontrada. Confira o código.');
  return match;
}

async function commit(store: Store, m: MatchRow): Promise<MatchRow> {
  m.version++;
  m.updatedAt = new Date().toISOString();
  await store.put('matches', m.id, m);
  return m;
}

export async function createMatch(host: UserRow, color: unknown): Promise<MatchRow> {
  const store = await getStore();
  const side: Color = color === 'b' ? 'b' : color === 'w' ? 'w' : Math.random() < 0.5 ? 'w' : 'b';
  const now = new Date().toISOString();
  const match: MatchRow = {
    id: await newCode(store),
    hostId: host.id,
    whiteId: side === 'w' ? host.id : null,
    blackId: side === 'b' ? host.id : null,
    moves: [],
    status: 'waiting',
    reason: null,
    winner: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await store.put('matches', match.id, match);
  return match;
}

/** Partidas do usuário. De passagem, apaga as que estão paradas há mais de 7 dias. */
export async function listMatches(userId: string): Promise<MatchRow[]> {
  const store = await getStore();
  const all = await store.list<MatchRow>('matches');
  const now = Date.now();
  const stale = all.filter((m) => now - Date.parse(m.updatedAt) > WEEK_MS);
  for (const m of stale.slice(0, 20)) await store.remove('matches', m.id);
  return all
    .filter((m) => !stale.includes(m) && (m.whiteId === userId || m.blackId === userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);
}

/** Entra na partida como o segundo jogador. Quem já está nela só "volta". */
export async function joinMatch(id: string, user: UserRow): Promise<MatchRow> {
  const m = await getMatch(id);
  if (m.whiteId === user.id || m.blackId === user.id) return m;
  if (m.status !== 'waiting') throw new HttpError(409, 'Essa partida já tem dois jogadores.');
  if (m.whiteId) m.blackId = user.id;
  else m.whiteId = user.id;
  m.status = 'playing';
  return commit(await getStore(), m);
}

function colorOf(m: MatchRow, userId: string): Color {
  if (m.whiteId === userId) return 'w';
  if (m.blackId === userId) return 'b';
  throw new HttpError(403, 'Você não está nessa partida.');
}

/** Encerra a partida e distribui o Score (uma vez só). */
async function finish(store: Store, m: MatchRow, reason: MatchRow['reason'], winner: Color | null): Promise<void> {
  m.status = 'finished';
  m.reason = reason;
  m.winner = winner;
  // partidas curtíssimas não contam: evita "ganhar" score com desistência combinada
  if (!m.whiteId || !m.blackId || m.moves.length < ONLINE_MIN_PLIES_FOR_SCORE) return;
  for (const [id, color] of [
    [m.whiteId, 'w'],
    [m.blackId, 'b'],
  ] as [string, Color][]) {
    const u = await store.get<UserRow>('users', id);
    if (!u) continue;
    const outcome = winner === null ? 'draw' : winner === color ? 'win' : 'loss';
    u.score = Math.max(0, (u.score ?? 0) + ONLINE_SCORE[outcome]);
    u.online = u.online ?? { wins: 0, losses: 0, draws: 0 };
    if (outcome === 'win') u.online.wins++;
    else if (outcome === 'loss') u.online.losses++;
    else u.online.draws++;
    await store.put('users', u.id, u);
  }
}

export async function playMove(id: string, user: UserRow, input: unknown): Promise<MatchRow> {
  const store = await getStore();
  const m = await getMatch(id);
  const color = colorOf(m, user.id);
  if (m.status === 'waiting') throw new HttpError(409, 'Espere seu amigo entrar na partida.');
  if (m.status === 'finished') throw new HttpError(409, 'Essa partida já terminou.');
  const game = ChessGame.fromMoves(START_FEN, m.moves);
  if (game.turn !== color) throw new HttpError(409, 'Não é a sua vez.');
  const raw = (input ?? {}) as Partial<MoveInput>;
  const record = game.move({ from: String(raw.from ?? ''), to: String(raw.to ?? ''), promotion: raw.promotion });
  if (!record) throw new HttpError(400, 'Lance inválido.');
  m.moves.push(record.san);
  const snapshot = game.snapshot();
  if (snapshot.status !== 'playing') await finish(store, m, snapshot.status, snapshot.winner);
  return commit(store, m);
}

export async function resignMatch(id: string, user: UserRow): Promise<MatchRow> {
  const store = await getStore();
  const m = await getMatch(id);
  const color = colorOf(m, user.id);
  if (m.status === 'finished') return m;
  if (m.status === 'waiting') {
    // ninguém entrou ainda: o convite é simplesmente cancelado
    await store.remove('matches', m.id);
    return { ...m, status: 'finished', reason: 'resigned' };
  }
  await finish(store, m, 'resigned', color === 'w' ? 'b' : 'w');
  return commit(store, m);
}
