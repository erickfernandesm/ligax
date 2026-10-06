import { endSession, route } from '@/server/auth';

export const POST = route(async () => {
  await endSession();
  return Response.json({ ok: true });
});
