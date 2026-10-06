import { scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import type { User, UserRole } from '@/core/domain/types';
import { envVar, getStore, newId } from './store';
import type { SessionRow, UserRow } from './types';

// Contas e sessões. O cookie guarda um token aleatório e o banco guarda só o
// hash desse token. Senhas: PBKDF2-SHA256 com sal (Web Crypto, que existe tanto
// no Node quanto na Cloudflare).

const COOKIE = 'ligax_session';
const SESSION_DAYS = 30;
const AVATAR_COLORS = ['#81a44c', '#2f8f9d', '#d2572f', '#5a4b8c', '#c9952b', '#595c4e'];

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function toPublicUser(u: UserRow): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarColor: u.avatarColor,
    score: u.score ?? 0,
    online: u.online ?? { wins: 0, losses: 0, draws: 0 },
    createdAt: u.createdAt,
  };
}

// ───────────────────────── senha ─────────────────────────

const PBKDF2_ITERATIONS = 100_000; // teto aceito pela Cloudflare
const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (text: string) => new Uint8Array((text.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

async function sha256(text: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${hex(salt)}$${hex(await pbkdf2(password, salt, PBKDF2_ITERATIONS))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  try {
    if (parts[0] === 'pbkdf2') {
      const expected = unhex(parts[3]);
      return timingSafeEqual(expected, await pbkdf2(password, unhex(parts[2]), Number(parts[1])));
    }
    if (parts[0] === 'scrypt') {
      // contas criadas antes da troca para PBKDF2
      const expected = Buffer.from(parts[2], 'hex');
      return timingSafeEqual(expected, scryptSync(password, Buffer.from(parts[1], 'hex'), expected.length));
    }
  } catch {
    /* hash malformado: trata como senha errada */
  }
  return false;
}

// ───────────────────────── validação ─────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NICK_RE = /^[\p{L}\p{N}_.-]{3,20}$/u;

export async function validateNick(nick: string, ignoreUserId?: string): Promise<string> {
  const name = nick.trim();
  if (!NICK_RE.test(name)) throw new HttpError(400, 'O nick precisa ter de 3 a 20 caracteres: letras, números, ponto, hífen ou _.');
  const users = await (await getStore()).list<UserRow>('users');
  if (users.some((u) => u.id !== ignoreUserId && u.name.toLowerCase() === name.toLowerCase())) {
    throw new HttpError(409, 'Esse nick já está em uso. Escolha outro.');
  }
  return name;
}

export async function registerUser(input: { email: unknown; password: unknown; nick: unknown }): Promise<UserRow> {
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Digite um e-mail válido.');
  if (password.length < 8) throw new HttpError(400, 'A senha precisa ter pelo menos 8 caracteres.');
  if (password.length > 200) throw new HttpError(400, 'Senha longa demais.');
  const store = await getStore();
  const users = await store.list<UserRow>('users');
  if (users.some((u) => u.email === email)) throw new HttpError(409, 'Já existe uma conta com esse e-mail. Tente entrar.');
  const name = await validateNick(String(input.nick ?? ''));
  // Quem vira admin sozinho: e-mails em LIGAX_ADMIN_EMAILS ou a primeira conta criada.
  const admins = (envVar('LIGAX_ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const user: UserRow = {
    id: newId('u_'),
    email,
    name,
    role: admins.includes(email) || users.length === 0 ? 'admin' : 'aluno',
    avatarColor: AVATAR_COLORS[users.length % AVATAR_COLORS.length],
    passwordHash: await hashPassword(password),
    score: 0,
    online: { wins: 0, losses: 0, draws: 0 },
    createdAt: new Date().toISOString(),
  };
  await store.put('users', user.id, user);
  return user;
}

// Freio simples contra tentativa e erro de senha: 8 erros por e-mail a cada 10 minutos.
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function loginUser(input: { email: unknown; password: unknown }): Promise<UserRow> {
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const now = Date.now();
  const entry = attempts.get(email);
  if (entry && entry.resetAt > now && entry.count >= 8) {
    throw new HttpError(429, 'Muitas tentativas. Espere alguns minutos e tente de novo.');
  }
  const users = await (await getStore()).list<UserRow>('users');
  const user = users.find((u) => u.email === email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + 10 * 60 * 1000 };
    current.count++;
    attempts.set(email, current);
    throw new HttpError(401, 'E-mail ou senha incorretos.');
  }
  attempts.delete(email);
  return user;
}

export async function changePassword(user: UserRow, current: unknown, next: unknown): Promise<void> {
  if (!(await verifyPassword(String(current ?? ''), user.passwordHash))) throw new HttpError(401, 'A senha atual não confere.');
  const password = String(next ?? '');
  if (password.length < 8) throw new HttpError(400, 'A nova senha precisa ter pelo menos 8 caracteres.');
  if (password.length > 200) throw new HttpError(400, 'Senha longa demais.');
  user.passwordHash = await hashPassword(password);
  await (await getStore()).put('users', user.id, user);
}

// ───────────────────────── sessão ─────────────────────────

export async function startSession(userId: string): Promise<void> {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const tokenHash = await sha256(token);
  await (await getStore()).put<SessionRow>('sessions', tokenHash, { tokenHash, userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && envVar('LIGAX_INSECURE_COOKIE') !== '1',
    path: '/',
    expires: new Date(expiresAt),
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await (await getStore()).remove('sessions', await sha256(token));
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<UserRow | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const store = await getStore();
  const tokenHash = await sha256(token);
  const session = await store.get<SessionRow>('sessions', tokenHash);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    await store.remove('sessions', tokenHash);
    return null;
  }
  return store.get<UserRow>('users', session.userId);
}

export async function requireUser(): Promise<UserRow> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, 'Entre na sua conta para continuar.');
  return user;
}

/** Professores e admins publicam conteúdo; só admins gerenciam contas. */
export async function requireRole(...roles: UserRole[]): Promise<UserRow> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new HttpError(403, 'Sua conta não tem permissão para isso.');
  return user;
}

// ───────────────────────── respostas ─────────────────────────

/** Envolve uma rota: transforma HttpError em resposta JSON com mensagem em português. */
export function route<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof HttpError) return Response.json({ error: err.message }, { status: err.status });
      console.error('[api]', err);
      return Response.json({ error: 'Algo deu errado no servidor. Tente de novo.' }, { status: 500 });
    }
  };
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    throw new HttpError(400, 'Requisição inválida.');
  }
}
