import { changePassword, currentUser, readJson, requireUser, route, toPublicUser, validateNick } from '@/server/auth';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';

/** Quem está logado (ou null). */
export const GET = route(async () => {
  const user = await currentUser();
  return Response.json({ user: user ? toPublicUser(user) : null });
});

/** Editar nick, cor do avatar ou senha. */
export const PATCH = route(async (request: Request) => {
  const user = await requireUser();
  const body = await readJson(request);
  if (body.newPassword !== undefined) await changePassword(user, body.currentPassword, body.newPassword);
  if (typeof body.name === 'string') user.name = await validateNick(body.name, user.id);
  if (typeof body.avatarColor === 'string' && /^#[0-9a-f]{6}$/i.test(body.avatarColor)) user.avatarColor = body.avatarColor;
  await (await getStore()).put('users', user.id, user);
  return Response.json({ user: toPublicUser(user) });
});
