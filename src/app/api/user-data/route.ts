import { HttpError, readJson, requireUser, route } from '@/server/auth';
import { getStore } from '@/server/store';
import type { UserDataRow } from '@/server/types';

export const dynamic = 'force-dynamic';

/** Progresso, posições e desafios criados: os dados de jogo da conta. */
export const GET = route(async () => {
  const user = await requireUser();
  return Response.json({ data: await (await getStore()).get<UserDataRow>('userData', user.id) });
});

export const PUT = route(async (request: Request) => {
  const user = await requireUser();
  const body = await readJson(request);
  if (JSON.stringify(body).length > 900_000) throw new HttpError(413, 'Dados grandes demais para salvar.');
  const data: UserDataRow = {
    progress: (body.progress ?? null) as UserDataRow['progress'],
    positions: Array.isArray(body.positions) ? (body.positions as UserDataRow['positions']) : [],
    customChallenges: Array.isArray(body.customChallenges) ? (body.customChallenges as UserDataRow['customChallenges']) : [],
    updatedAt: new Date().toISOString(),
  };
  await (await getStore()).put('userData', user.id, data);
  return Response.json({ ok: true });
});
