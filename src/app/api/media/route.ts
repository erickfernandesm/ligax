import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { HttpError, requireRole, route } from '@/server/auth';
import { envVar, getStore, newId, UPLOAD_DIR } from '@/server/store';
import type { MediaRow } from '@/server/types';

export const runtime = 'nodejs';

const ALLOWED = ['.mp4', '.webm', '.mov', '.m4v', '.ogv'];

/**
 * Upload de vídeo de aula (professores e admins), gravado em disco aos poucos.
 * Só funciona onde existe disco (servidor Node). Na Cloudflare não há disco:
 * lá as aulas usam link do YouTube ou link direto. Para ter upload na
 * Cloudflare, este é o ponto para ligar um bucket R2.
 */
export const POST = route(async (request: Request) => {
  const user = await requireRole('professor', 'admin');
  const store = await getStore();
  if (store.kind !== 'file') throw new HttpError(501, 'Este servidor não guarda arquivos. Use um link do YouTube.');
  const maxBytes = Number(envVar('LIGAX_MAX_UPLOAD_MB') ?? 1024) * 1024 * 1024;
  const originalName = (new URL(request.url).searchParams.get('name') ?? 'video.mp4').slice(0, 120);
  const ext = extname(originalName).toLowerCase();
  if (!ALLOWED.includes(ext)) throw new HttpError(400, 'Formato não aceito. Envie MP4, WebM ou MOV.');
  if (!request.body) throw new HttpError(400, 'Nenhum arquivo recebido.');

  const id = newId('m_');
  const fileName = id + ext;
  const path = join(UPLOAD_DIR, fileName);
  await mkdir(UPLOAD_DIR, { recursive: true });

  let size = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, done) {
      size += chunk.length;
      done(size > maxBytes ? new HttpError(413, 'Vídeo grande demais.') : null, chunk);
    },
  });
  try {
    await pipeline(Readable.fromWeb(request.body as never), limiter, createWriteStream(path));
  } catch (err) {
    await unlink(path).catch(() => {});
    if (err instanceof HttpError) throw err;
    const code = (err as NodeJS.ErrnoException).code;
    throw new HttpError(507, code === 'ENOSPC' ? 'O servidor está sem espaço em disco para guardar o vídeo.' : 'O envio do vídeo falhou. Tente de novo.');
  }
  if (size === 0) {
    await unlink(path).catch(() => {});
    throw new HttpError(400, 'O arquivo está vazio.');
  }

  const media: MediaRow = {
    id,
    fileName,
    originalName,
    contentType: request.headers.get('content-type') || 'video/mp4',
    size,
    ownerId: user.id,
    createdAt: new Date().toISOString(),
  };
  await store.put('media', id, media);
  return Response.json({ mediaId: id, name: originalName, size });
});
