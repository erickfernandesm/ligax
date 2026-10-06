import { readJson, requireRole, route } from '@/server/auth';
import { saveProfessor } from '@/server/content';

/** Criar ou editar o perfil de um professor (só admins). */
export const POST = route(async (request: Request) => {
  await requireRole('admin');
  return Response.json({ professor: await saveProfessor(await readJson(request)) });
});
