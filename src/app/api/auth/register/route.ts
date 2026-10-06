import { readJson, registerUser, route, startSession, toPublicUser } from '@/server/auth';

export const POST = route(async (request: Request) => {
  const body = await readJson(request);
  const user = await registerUser({ email: body.email, password: body.password, nick: body.nick });
  await startSession(user.id);
  return Response.json({ user: toPublicUser(user) });
});
