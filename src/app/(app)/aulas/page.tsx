'use client';

import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { Chip, EmptyState } from '@/components/ui/primitives';
import { CATEGORY_LABEL, LEVEL_LABEL } from '@/content/lessons';
import type { LessonCategory, LessonLevel } from '@/core/domain/types';
import { LessonCard } from '@/features/lessons/LessonCard';
import { useContentStore } from '@/stores/content';
import { useProgressStore } from '@/stores/progress';

type Filter =
  | { kind: 'all' }
  | { kind: 'category'; value: LessonCategory }
  | { kind: 'level'; value: LessonLevel };

const FILTERS: { label: string; filter: Filter }[] = [
  { label: 'Todos', filter: { kind: 'all' } },
  { label: CATEGORY_LABEL.fundamentos, filter: { kind: 'category', value: 'fundamentos' } },
  { label: CATEGORY_LABEL.estrategia, filter: { kind: 'category', value: 'estrategia' } },
  { label: CATEGORY_LABEL.tatica, filter: { kind: 'category', value: 'tatica' } },
  { label: CATEGORY_LABEL.finais, filter: { kind: 'category', value: 'finais' } },
  { label: 'Iniciantes', filter: { kind: 'level', value: 'iniciante' } },
  { label: LEVEL_LABEL.intermediario, filter: { kind: 'level', value: 'intermediario' } },
  { label: LEVEL_LABEL.avancado, filter: { kind: 'level', value: 'avancado' } },
];

export default function AulasPage() {
  const professors = useContentStore((s) => s.professors);
  const lessons = useContentStore((s) => s.lessons);
  const completed = useProgressStore((s) => s.progress.lessonsCompleted);
  const [filterIndex, setFilterIndex] = useState(0);
  const [professorId, setProfessorId] = useState<string | null>(null);

  const visibleProfessors = professors.filter((p) => p.published);
  const filter = FILTERS[filterIndex].filter;
  const published = lessons.filter((l) => l.published).length;

  const list = useMemo(
    () =>
      lessons
        .filter((l) => l.published && visibleProfessors.some((p) => p.id === l.professorId))
        .filter((l) => !professorId || l.professorId === professorId)
        .filter((l) =>
          filter.kind === 'all' ? true : filter.kind === 'category' ? l.category === filter.value : l.level === filter.value,
        )
        .sort((a, b) => a.professorId.localeCompare(b.professorId) || a.number - b.number),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lessons, professors, professorId, filterIndex],
  );

  return (
    <>
      <PageHeader kicker="Aulas" title="Todas as aulas" backHref="/aprender" />

      {/* professores */}
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {visibleProfessors.map((p) => {
          const active = professorId === p.id;
          return (
            <div key={p.id} className="flex w-[76px] shrink-0 flex-col items-center text-center">
              <button
                type="button"
                aria-pressed={active}
                aria-label={`Filtrar por ${p.name}`}
                onClick={() => setProfessorId(active ? null : p.id)}
                className={active ? '' : 'opacity-70'}
              >
                <CharacterAvatar characterId={p.characterId} src={p.avatar} name={p.name} accent={p.accent} size={62} ring={active} />
              </button>
              <Link href={`/professores/${p.id}`} className="mt-0.5 flex min-h-10 w-full items-center justify-center text-xs leading-tight font-bold text-ink underline-offset-2 hover:underline">
                {p.name}
              </Link>
            </div>
          );
        })}
      </div>

      {/* filtros */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 py-1">
        {FILTERS.map((f, i) => (
          <Chip key={f.label} active={filterIndex === i} onClick={() => setFilterIndex(i)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
        {list.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            professor={professors.find((p) => p.id === lesson.professorId)}
            done={!!completed[lesson.id]}
          />
        ))}
      </div>
      {list.length === 0 && (
        <EmptyState
          icon={<BookOpen size={32} />}
          title={published === 0 ? 'As aulas em vídeo estão chegando' : 'Nenhuma aula com esse filtro'}
          text={
            published === 0
              ? 'Assim que um professor publicar um vídeo, ele aparece aqui. Enquanto isso, tem lição guiada no Modo Ensino.'
              : 'Tente outra categoria ou tire o filtro de professor.'
          }
        />
      )}
    </>
  );
}
