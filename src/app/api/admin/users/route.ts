import { requireRole, route, toPublicUser } from '@/server/auth';
import { getStore } from '@/server/store';
import type { UserRow } from '@/server/types';

export const dynamic = 'force-dynamic';

/** Lista de contas (só admins). */
export const GET = route(async () => {
  await requireRole('admin');
  const users = (await (await getStore()).list<UserRow>('users'))
    .map(toPublicUser)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return Response.json({ users });
});
