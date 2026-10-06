import type { Lesson, LessonCategory, LessonLevel, Professor, VideoSource } from '@/core/domain/types';
import { HttpError } from './auth';
import { getStore, newId } from './store';
import type { MediaRow } from './types';

// Professores e aulas: conteúdo compartilhado por todas as contas.

const CATEGORIES: LessonCategory[] = ['fundamentos', 'estrategia', 'tatica', 'finais', 'avancado'];
const LEVELS: LessonLevel[] = ['iniciante', 'intermediario', 'avancado'];
const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/** Alunos só enxergam o que está publicado; professores e admins veem tudo. */
export async function listContent(staff: boolean): Promise<{ professors: Professor[]; lessons: Lesson[] }> {
  const store = await getStore();
  const [allProfessors, allLessons] = await Promise.all([store.list<Professor>('professors'), store.list<Lesson>('lessons')]);
  if (staff) return { professors: allProfessors, lessons: allLessons };
  const professors = allProfessors.filter((p) => p.published);
  return {
    professors,
    lessons: allLessons.filter((l) => l.published && professors.some((p) => p.id === l.professorId)),
  };
}

async function parseVideo(raw: unknown): Promise<VideoSource | null> {
  const v = raw as Partial<VideoSource> & { url?: string; mediaId?: string; name?: string };
  if (!v || typeof v !== 'object') return null;
  if (v.kind === 'youtube' || v.kind === 'url') {
    const url = text(v.url, 500);
    if (!/^https?:\/\//.test(url)) throw new HttpError(400, 'O link do vídeo precisa começar com http:// ou https://');
    return { kind: v.kind, url };
  }
  if (v.kind === 'upload') {
    const mediaId = text(v.mediaId, 80);
    if (!(await (await getStore()).get<MediaRow>('media', mediaId))) {
      throw new HttpError(400, 'O arquivo de vídeo não foi encontrado. Envie de novo.');
    }
    return { kind: 'upload', mediaId, name: text(v.name, 120) };
  }
  return null;
}

export async function saveLesson(input: Record<string, unknown>): Promise<Lesson> {
  const store = await getStore();
  const existing = typeof input.id === 'string' ? await store.get<Lesson>('lessons', input.id) : null;
  const title = text(input.title, 70);
  if (title.length < 3) throw new HttpError(400, 'Dê um título para a aula.');
  const professorId = text(input.professorId, 80);
  if (!(await store.get('professors', professorId))) throw new HttpError(400, 'Escolha o professor da aula.');
  const video = await parseVideo(input.video);
  const published = !!input.published;
  // Aula é vídeo: sem vídeo, fica como rascunho.
  if (published && !video) throw new HttpError(400, 'Adicione o vídeo antes de publicar a aula.');
  const practice = input.practice as Lesson['practice'];
  const lesson: Lesson = {
    id: existing?.id ?? newId('aula_'),
    professorId,
    number: Math.max(1, Math.floor(Number(input.number) || 1)),
    title,
    description: text(input.description, 240),
    category: CATEGORIES.includes(input.category as LessonCategory) ? (input.category as LessonCategory) : 'fundamentos',
    level: LEVELS.includes(input.level as LessonLevel) ? (input.level as LessonLevel) : 'iniciante',
    minutes: Math.max(1, Math.floor(Number(input.minutes) || 1)),
    thumbnail: typeof input.thumbnail === 'string' && input.thumbnail.length < 400_000 ? input.thumbnail : undefined,
    video,
    keyPoints: Array.isArray(input.keyPoints) ? input.keyPoints.map((k) => text(k, 200)).filter(Boolean).slice(0, 10) : [],
    practice:
      practice && typeof practice.fen === 'string'
        ? {
            name: text(practice.name, 60),
            description: text(practice.description, 200),
            fen: practice.fen,
            annotations: practice.annotations ?? { squares: [], arrows: [] },
          }
        : null,
    published,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await store.put('lessons', lesson.id, lesson);
  return lesson;
}

export async function removeLesson(id: string): Promise<void> {
  await (await getStore()).remove('lessons', id);
}

export async function saveProfessor(input: Record<string, unknown>): Promise<Professor> {
  const store = await getStore();
  const existing = typeof input.id === 'string' ? await store.get<Professor>('professors', input.id) : null;
  const name = text(input.name, 40);
  if (name.length < 2) throw new HttpError(400, 'Dê um nome para o professor.');
  const professor: Professor = {
    id: existing?.id ?? newId('prof_'),
    characterId: existing?.characterId,
    name,
    title: text(input.title, 50) || 'Professor',
    area: CATEGORIES.includes(input.area as LessonCategory) ? (input.area as LessonCategory) : 'fundamentos',
    bio: text(input.bio, 300),
    avatar: typeof input.avatar === 'string' && input.avatar.length < 400_000 ? input.avatar : undefined,
    accent: existing?.characterId ? existing.accent : text(input.accent, 9) || undefined,
    published: input.published !== false,
  };
  await store.put('professors', professor.id, professor);
  return professor;
}

export async function removeProfessor(id: string): Promise<void> {
  const store = await getStore();
  const target = await store.get<Professor>('professors', id);
  if (target?.characterId) throw new HttpError(400, 'Os professores da casa não podem ser excluídos, só ocultados.');
  await store.remove('professors', id);
  for (const l of await store.list<Lesson>('lessons')) {
    if (l.professorId === id) await store.remove('lessons', l.id);
  }
}
