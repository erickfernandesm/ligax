import { requireUser, route } from '@/server/auth';
import { getMatch, toView } from '@/server/matches';

export const dynamic = 'force-dynamic';

/**
 * Estado da partida. O cliente manda a versão que já tem (?v=); se nada mudou,
 * a resposta é um 204 vazio: consulta barata para repetir enquanto se joga.
 */
export const GET = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const match = await getMatch((await params).id);
  const known = Number(new URL(request.url).searchParams.get('v') ?? 0);
  if (known === match.version) return new Response(null, { status: 204 });
  return Response.json({ match: await toView(match) });
});
