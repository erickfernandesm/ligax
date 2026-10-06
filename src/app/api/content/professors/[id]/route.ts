import { requireRole, route } from '@/server/auth';
import { removeProfessor } from '@/server/content';

export const DELETE = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole('admin');
  await removeProfessor((await params).id);
  return Response.json({ ok: true });
});
