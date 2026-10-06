import { readJson, requireUser, route, toPublicUser } from '@/server/auth';
import { playMove, toView } from '@/server/matches';
import { getStore } from '@/server/store';
import type { UserRow } from '@/server/types';

export const POST = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const match = await playMove((await params).id, user, await readJson(request));
  // o usuário volta junto: se a partida acabou, o Score dele já está atualizado
  const fresh = (await (await getStore()).get<UserRow>('users', user.id)) ?? user;
  return Response.json({ match: await toView(match), user: toPublicUser(fresh) });
});
