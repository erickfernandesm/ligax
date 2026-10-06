import type { RankingEntry } from '@/core/domain/types';
import { requireUser, route } from '@/server/auth';
import { getStore } from '@/server/store';
import type { UserRow } from '@/server/types';

export const dynamic = 'force-dynamic';

/** Os maiores Scores das partidas online. */
export const GET = route(async () => {
  await requireUser();
  const ranking: RankingEntry[] = (await (await getStore()).list<UserRow>('users'))
    .filter((u) => (u.score ?? 0) > 0)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 20)
    .map((u) => ({ id: u.id, name: u.name, avatarColor: u.avatarColor, score: u.score ?? 0, wins: u.online?.wins ?? 0 }));
  return Response.json({ ranking });
});
