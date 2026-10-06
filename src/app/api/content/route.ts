import { currentUser, route } from '@/server/auth';
import { listContent } from '@/server/content';
import { getStore } from '@/server/store';

export const dynamic = 'force-dynamic';

export const GET = route(async () => {
  const user = await currentUser();
  const staff = user?.role === 'professor' || user?.role === 'admin';
  // envio de arquivo de vídeo só existe onde há disco (fora da Cloudflare)
  const uploads = (await getStore()).kind === 'file';
  return Response.json({ ...(await listContent(staff)), features: { uploads } });
});
