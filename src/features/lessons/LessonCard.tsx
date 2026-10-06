'use client';

import { Check, Clock, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { cn } from '@/components/ui/cn';
import { Tag } from '@/components/ui/primitives';
import { findCharacter } from '@/content/characters';
import { CATEGORY_LABEL, LEVEL_LABEL } from '@/content/lessons';
import type { Lesson, Professor } from '@/core/domain/types';

export function professorAccent(p: Professor | undefined): string {
  return p?.accent ?? findCharacter(p?.characterId)?.accent ?? '#595c4e';
}

/** Capa da aula: thumbnail enviada pelo painel ou uma capa gerada com o professor. */
export function LessonCover({
  lesson,
  professor,
  className,
}: {
  lesson: Lesson;
  professor?: Professor;
  className?: string;
}) {
  const accent = professorAccent(professor);
  return (
    <div className={cn('relative aspect-video overflow-hidden rounded-2xl bg-night', className)}>
      {lesson.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lesson.thumbnail} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-end justify-between p-3"
          style={{ background: `linear-gradient(135deg, ${accent} 0%, #1c1f15 78%)` }}
        >
          <span className="display text-[44px] leading-none text-white/90">
            {String(lesson.number).padStart(2, '0')}
          </span>
          <CharacterAvatar
            characterId={professor?.characterId}
            src={professor?.avatar}
            name={professor?.name}
            size={54}
            ring={false}
            shape="rounded"
          />
        </div>
      )}
      {lesson.video && (
        <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-night/80 px-2 py-1 text-[11px] font-bold text-lime">
          <PlayCircle size={13} /> Vídeo
        </span>
      )}
    </div>
  );
}

export function LessonCard({
  lesson,
  professor,
  done,
}: {
  lesson: Lesson;
  professor?: Professor;
  done: boolean;
}) {
  return (
    <Link href={`/aulas/${lesson.id}`} className="flex min-w-0 gap-3 rounded-2xl bg-card p-2.5 active:bg-paper">
      <LessonCover lesson={lesson} professor={professor} className="w-[38%] max-w-[168px] shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Tag color={professorAccent(professor)}>{CATEGORY_LABEL[lesson.category]}</Tag>
          <Tag>{LEVEL_LABEL[lesson.level]}</Tag>
        </div>
        <h3 className="mt-1.5 line-clamp-2 leading-tight font-bold text-ink">
          Aula {String(lesson.number).padStart(2, '0')}: {lesson.title}
        </h3>
        <p className="mt-auto flex items-center gap-2 pt-1 text-xs text-mute">
          <span className="truncate">{professor?.name}</span>
          <span className="flex shrink-0 items-center gap-1">
            <Clock size={12} /> {lesson.minutes} min
          </span>
          {done && (
            <span className="ml-auto flex shrink-0 items-center gap-1 font-bold text-brand-deep">
              <Check size={14} strokeWidth={3} /> Concluída
            </span>
          )}
        </p>
      </div>
    </Link>
  );
}
