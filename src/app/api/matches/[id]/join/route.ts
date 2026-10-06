import { requireUser, route } from '@/server/auth';
import { joinMatch, toView } from '@/server/matches';

export const POST = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  return Response.json({ match: await toView(await joinMatch((await params).id, user)) });
});
