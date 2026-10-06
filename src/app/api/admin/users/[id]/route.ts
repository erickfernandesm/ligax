import type { UserRole } from '@/core/domain/types';
import { HttpError, readJson, requireRole, route, toPublicUser } from '@/server/auth';
import { getStore } from '@/server/store';
import type { UserRow } from '@/server/types';

const ROLES: UserRole[] = ['aluno', 'professor', 'admin'];

/** Muda a permissão de uma conta (só admins). */
export const PATCH = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireRole('admin');
  const { id } = await params;
  const body = await readJson(request);
  const role = body.role as UserRole;
  if (!ROLES.includes(role)) throw new HttpError(400, 'Permissão inválida.');
  const store = await getStore();
  const users = await store.list<UserRow>('users');
  const target = users.find((u) => u.id === id);
  if (!target) throw new HttpError(404, 'Conta não encontrada.');
  // nunca deixar a plataforma sem nenhum admin
  if (target.role === 'admin' && role !== 'admin' && users.filter((u) => u.role === 'admin').length === 1) {
    throw new HttpError(400, target.id === admin.id ? 'Você é o único admin. Promova outra conta antes de sair.' : 'Precisa existir pelo menos um admin.');
  }
  target.role = role;
  await store.put('users', target.id, target);
  return Response.json({ user: toPublicUser(target) });
});
