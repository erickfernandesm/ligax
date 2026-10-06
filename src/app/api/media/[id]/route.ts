import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { HttpError, requireUser, route } from '@/server/auth';
import { getStore, UPLOAD_DIR } from '@/server/store';
import type { MediaRow } from '@/server/types';

export const runtime = 'nodejs';

/** Entrega o vídeo com suporte a Range (o player consegue pular para qualquer ponto). */
export const GET = route(async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const store = await getStore();
  const media = store.kind === 'file' ? await store.get<MediaRow>('media', (await params).id) : null;
  const path = media ? join(UPLOAD_DIR, media.fileName) : '';
  if (!media || !existsSync(path)) throw new HttpError(404, 'Vídeo não encontrado.');

  const total = statSync(path).size;
  const headers: Record<string, string> = {
    'Content-Type': media.contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : total - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : total - 1;
    start = Math.max(0, start);
    end = Math.min(total - 1, end);
    if (start > end) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
    return new Response(Readable.toWeb(createReadStream(path, { start, end })) as never, {
      status: 206,
      headers: { ...headers, 'Content-Range': `bytes ${start}-${end}/${total}`, 'Content-Length': String(end - start + 1) },
    });
  }
  return new Response(Readable.toWeb(createReadStream(path)) as never, {
    headers: { ...headers, 'Content-Length': String(total) },
  });
});
