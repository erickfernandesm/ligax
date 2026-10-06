import { readJson, requireRole, route } from '@/server/auth';
import { saveLesson } from '@/server/content';

/** Criar ou editar uma aula (professores e admins). */
export const POST = route(async (request: Request) => {
  await requireRole('professor', 'admin');
  return Response.json({ lesson: await saveLesson(await readJson(request)) });
});
