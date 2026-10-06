import { requireRole, route } from '@/server/auth';
import { removeLesson } from '@/server/content';

export const DELETE = route(async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole('professor', 'admin');
  await removeLesson((await params).id);
  return Response.json({ ok: true });
});
