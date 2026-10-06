'use client';

import { Check, ChevronRight, FlaskConical, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { cn } from '@/components/ui/cn';
import { findCharacter } from '@/content/characters';
import { teachModulesOf } from '@/content/teaching';
import { useContentStore } from '@/stores/content';
import { useProgressStore } from '@/stores/progress';

export default function AprenderPage() {
  const professors = useContentStore((s) => s.professors);
  const lessons = useContentStore((s) => s.lessons);
  const done = useProgressStore((s) => s.progress.teachCompleted);
  const publishedLessons = lessons.filter((l) => l.published).length;

  return (
    <>
      <PageHeader kicker="Modo Ensino" title="Aprenda jogando">
        Cada professor ensina uma coisa. Ele fala, mostra no tabuleiro e pede pra você jogar.
      </PageHeader>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/aulas" className="night-surface flex min-h-[84px] flex-col justify-between rounded-2xl p-3.5">
          <PlayCircle size={22} className="text-lime" />
          <span>
            <span className="block font-bold text-paper">Aulas</span>
            <span className="block text-xs text-paper/60">{publishedLessons === 0 ? 'Vídeos dos professores' : `${publishedLessons} vídeos dos professores`}</span>
          </span>
        </Link>
        <Link href="/laboratorio" className="flex min-h-[84px] flex-col justify-between rounded-2xl bg-card p-3.5">
          <FlaskConical size={22} className="text-brand-deep" />
          <span>
            <span className="block font-bold text-ink">Laboratório</span>
            <span className="block text-xs text-mute">Monte e analise posições</span>
          </span>
        </Link>
      </div>

      {professors
        .filter((p) => p.published)
        .map((professor) => {
          const modules = teachModulesOf(professor.id);
          if (modules.length === 0) return null;
          const character = findCharacter(professor.characterId);
          const completed = modules.filter((m) => done[m.id]).length;
          return (
            <section key={professor.id} className="mt-8">
              <Link href={`/professores/${professor.id}`} className="flex items-center gap-3">
                <CharacterAvatar
                  characterId={professor.characterId}
                  src={professor.avatar}
                  name={professor.name}
                  accent={professor.accent}
                  size={56}
                />
                <span className="min-w-0 flex-1">
                  <span className="display block text-[28px] text-ink">{professor.name}</span>
                  <span className="block text-sm font-bold" style={{ color: character?.accent ?? professor.accent }}>
                    {professor.title}
                  </span>
                </span>
                <span className="text-sm font-bold text-mute tabular-nums">
                  {completed}/{modules.length}
                </span>
              </Link>

              <ul className="mt-3 overflow-hidden rounded-2xl bg-card">
                {modules.map((m, i) => {
                  const isDone = !!done[m.id];
                  return (
                    <li key={m.id} className={cn(i > 0 && 'border-t border-line')}>
                      <Link href={`/ensino/${m.id}`} className="flex min-h-[68px] items-center gap-3 px-4 py-3 active:bg-paper">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                            isDone ? 'bg-brand text-white' : 'bg-paper text-olive',
                          )}
                        >
                          {isDone ? <Check size={18} strokeWidth={3} /> : i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block leading-tight font-bold break-words text-ink">{m.title}</span>
                          <span className="mt-0.5 block text-sm leading-snug text-mute">{m.summary}</span>
                          <span className="mt-1 block text-xs font-bold text-mute">
                            {m.minutes} min · <span className="text-brand-deep">{isDone ? 'Revisar' : `+${m.xp} XP`}</span>
                          </span>
                        </span>
                        <ChevronRight size={18} className="shrink-0 text-mute" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
    </>
  );
}
