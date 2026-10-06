'use client';

import { Check, ChevronRight, Swords } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { LinkButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { EmptyState, ProgressBar, SectionTitle, Stat, Tag } from '@/components/ui/primitives';
import { findBot } from '@/content/bots';
import { findCharacter } from '@/content/characters';
import { CATEGORY_LABEL } from '@/content/lessons';
import { teachModulesOf } from '@/content/teaching';
import { LessonCard, professorAccent } from '@/features/lessons/LessonCard';
import { lessonsOf, useContentStore } from '@/stores/content';
import { useProgressStore } from '@/stores/progress';

export default function ProfessorPage() {
  const { professorId } = useParams<{ professorId: string }>();
  const router = useRouter();
  const professor = useContentStore((s) => s.professors.find((p) => p.id === professorId && p.published));
  const allLessons = useContentStore((s) => s.lessons);
  const progress = useProgressStore((s) => s.progress);

  useEffect(() => {
    if (!professor) router.replace('/aulas');
  }, [professor, router]);
  if (!professor) return null;

  const character = findCharacter(professor.characterId);
  const accent = professorAccent(professor);
  const lessons = lessonsOf(allLessons, professor.id);
  const modules = teachModulesOf(professor.id);
  const bot = findBot(professor.characterId);
  const lessonsDone = lessons.filter((l) => progress.lessonsCompleted[l.id]).length;
  const modulesDone = modules.filter((m) => progress.teachCompleted[m.id]).length;
  const total = lessons.length + modules.length;
  const done = lessonsDone + modulesDone;
  const videos = lessons.filter((l) => l.video).length;

  return (
    <>
      <Link href="/aulas" className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-olive">
        <span aria-hidden>←</span> Aulas
      </Link>

      <section className="night-surface swoosh rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <CharacterAvatar
            characterId={professor.characterId}
            src={professor.avatar}
            name={professor.name}
            accent={accent}
            size={92}
          />
          <div className="min-w-0">
            <Tag color="#bddb00">{CATEGORY_LABEL[professor.area]}</Tag>
            <h1 className="display mt-1 text-[38px] text-paper">{professor.name}</h1>
            <p className="text-sm font-bold text-paper/75">{professor.title}</p>
          </div>
        </div>
        {character?.tagline && <p className="mt-4 text-[15px] text-paper/90">“{character.tagline}”</p>}
        <p className="mt-2 text-sm leading-relaxed text-paper/70">{professor.bio}</p>
        {character && character.personality.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {character.personality.map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-paper/80">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat value={lessons.length} label={lessons.length === 1 ? 'Aula' : 'Aulas'} tone="night" />
          <Stat value={videos} label={videos === 1 ? 'Vídeo' : 'Vídeos'} tone="night" />
          <Stat value={modules.length} label="Lições guiadas" tone="night" />
        </div>
      </section>

      {total > 0 && (
        <div className="mt-4 rounded-2xl bg-card p-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-ink">Seu progresso com {professor.name.split(' ').slice(-1)[0]}</span>
            <span className="text-mute tabular-nums">
              {done}/{total}
            </span>
          </div>
          <ProgressBar value={done / total} className="mt-2" label="Progresso com este professor" />
        </div>
      )}

      {bot && (
        <LinkButton href="/jogar" variant="outline" block className="mt-3" icon={<Swords size={18} />}>
          Jogar contra o {professor.name}
        </LinkButton>
      )}

      {modules.length > 0 && (
        <>
          <SectionTitle className="mt-8">Lições no tabuleiro</SectionTitle>
          <ul className="overflow-hidden rounded-2xl bg-card">
            {modules.map((m, i) => {
              const isDone = !!progress.teachCompleted[m.id];
              return (
                <li key={m.id} className={cn(i > 0 && 'border-t border-line')}>
                  <Link href={`/ensino/${m.id}`} className="flex min-h-[64px] items-center gap-3 px-4 py-3 active:bg-paper">
                    <span
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                        isDone ? 'bg-brand text-white' : 'bg-paper text-olive',
                      )}
                    >
                      {isDone ? <Check size={18} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">{m.title}</span>
                      <span className="block truncate text-sm text-mute">{m.summary}</span>
                    </span>
                    <ChevronRight size={18} className="shrink-0 text-mute" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <SectionTitle className="mt-8">Aulas</SectionTitle>
      {lessons.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} professor={professor} done={!!progress.lessonsCompleted[l.id]} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nenhuma aula publicada" text="Quando este professor publicar uma aula, ela aparece aqui." />
      )}
    </>
  );
}
