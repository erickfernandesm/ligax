import { loginUser, readJson, route, startSession, toPublicUser } from '@/server/auth';

export const POST = route(async (request: Request) => {
  const body = await readJson(request);
  const user = await loginUser({ email: body.email, password: body.password });
  await startSession(user.id);
  return Response.json({ user: toPublicUser(user) });
});
