import { readJson, requireUser, route } from '@/server/auth';
import { createMatch, listMatches, toView } from '@/server/matches';

export const dynamic = 'force-dynamic';

/** Minhas partidas com amigos. */
export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ matches: await Promise.all((await listMatches(user.id)).map(toView)) });
});

/** Cria um convite. */
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = await readJson(request);
  return Response.json({ match: await toView(await createMatch(user, body.color)) });
});
