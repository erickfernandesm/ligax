import { requireUser, route, toPublicUser } from '@/server/auth';
import { resignMatch, toView } from '@/server/matches';
import { getStore } from '@/server/store';
import type { UserRow } from '@/server/types';

export const POST = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const match = await resignMatch((await params).id, user);
  const fresh = (await (await getStore()).get<UserRow>('users', user.id)) ?? user;
  return Response.json({ match: await toView(match), user: toPublicUser(fresh) });
});
