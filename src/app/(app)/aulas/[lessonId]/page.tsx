'use client';

import { ArrowRight, Check, Clock, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, LinkButton } from '@/components/ui/Button';
import { SectionTitle, Tag } from '@/components/ui/primitives';
import { CATEGORY_LABEL, LEVEL_LABEL } from '@/content/lessons';
import { LESSON_XP } from '@/content/progression';
import { fenToBoard, fenTurn } from '@/core/chess/fen';
import { LessonCover, professorAccent } from '@/features/lessons/LessonCard';
import { VideoPlayer } from '@/features/lessons/VideoPlayer';
import { encodeSharedPosition } from '@/services/share';
import { lessonsOf, useContentStore } from '@/stores/content';
import { useProgressStore } from '@/stores/progress';

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const router = useRouter();
  const loaded = useContentStore((s) => s.loaded);
  const lessons = useContentStore((s) => s.lessons);
  const professors = useContentStore((s) => s.professors);
  const completed = useProgressStore((s) => s.progress.lessonsCompleted);
  const completeLesson = useProgressStore((s) => s.completeLesson);

  const lesson = lessons.find((l) => l.id === lessonId);
  const professor = professors.find((p) => p.id === lesson?.professorId);
  const practice = lesson?.practice ?? null;
  const practiceBoard = useMemo(() => (practice ? fenToBoard(practice.fen) : null), [practice]);

  useEffect(() => {
    if (loaded && !lesson) router.replace('/aulas');
  }, [loaded, lesson, router]);
  if (!lesson) return null;

  const siblings = lessonsOf(lessons, lesson.professorId);
  const next = siblings[siblings.findIndex((l) => l.id === lesson.id) + 1];
  const done = !!completed[lesson.id];
  const watch = () => {
    if (!done) completeLesson(lesson.id);
  };

  return (
    <>
      <PageHeader backHref="/aulas" kicker={`Aula ${String(lesson.number).padStart(2, '0')}`} title={lesson.title} />

      {lesson.video ? (
        <VideoPlayer video={lesson.video} title={lesson.title} onEnded={watch} />
      ) : (
        <>
          <LessonCover lesson={lesson} professor={professor} />
          <p className="mt-2 rounded-xl bg-gold/15 px-3 py-2 text-sm font-bold text-olive">
            Rascunho: esta aula ainda não tem vídeo e não aparece para os alunos.
          </p>
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Tag color={professorAccent(professor)}>{CATEGORY_LABEL[lesson.category]}</Tag>
        <Tag>{LEVEL_LABEL[lesson.level]}</Tag>
        <span className="flex items-center gap-1 text-xs font-bold text-mute">
          <Clock size={13} /> {lesson.minutes} min
        </span>
        {!lesson.published && <Tag color="#c8452c">Não publicada</Tag>}
      </div>

      {lesson.video && (
        <div className="mt-4">
          {done ? (
            <p className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand/15 font-bold text-brand-deep">
              <Check size={18} strokeWidth={3} /> Aula assistida
            </p>
          ) : (
            <Button size="lg" block icon={<Check size={18} strokeWidth={3} />} onClick={watch}>
              Marcar como assistida · +{LESSON_XP} XP
            </Button>
          )}
        </div>
      )}

      {professor && (
        <Link href={`/professores/${professor.id}`} className="mt-5 flex items-center gap-3">
          <CharacterAvatar
            characterId={professor.characterId}
            src={professor.avatar}
            name={professor.name}
            accent={professor.accent}
            size={44}
          />
          <span>
            <span className="block font-bold text-ink">{professor.name}</span>
            <span className="block text-sm text-mute">{professor.title}</span>
          </span>
        </Link>
      )}

      {lesson.description && <p className="mt-4 text-[15px] leading-relaxed text-olive">{lesson.description}</p>}

      {lesson.keyPoints.length > 0 && (
        <>
          <SectionTitle className="mt-7">Pontos da aula</SectionTitle>
          <ol className="space-y-3">
            {lesson.keyPoints.map((point, i) => (
              <li key={i} className="flex gap-3">
                <span className="display mt-0.5 text-2xl leading-none text-brand">{i + 1}</span>
                <p className="text-[15px] leading-snug text-ink">{point}</p>
              </li>
            ))}
          </ol>
        </>
      )}

      {practice && practiceBoard && (
        <section className="night-surface mt-7 rounded-3xl p-4">
          <p className="text-[11px] font-bold tracking-wider text-lime uppercase">Agora pratique</p>
          <h2 className="display mt-0.5 text-[26px] text-paper">{practice.name}</h2>
          {practice.description && <p className="mt-1 text-sm text-paper/70">{practice.description}</p>}
          <div className="mx-auto mt-3 max-w-[340px]">
            <ChessBoard
              board={practiceBoard}
              orientation={fenTurn(practice.fen)}
              annotations={practice.annotations}
              aria-label={`Posição: ${practice.name}`}
            />
          </div>
          <LinkButton
            href={`/laboratorio?p=${encodeSharedPosition(practice)}`}
            variant="lime"
            block
            className="mt-4"
            icon={<FlaskConical size={18} />}
          >
            Abrir posição
          </LinkButton>
        </section>
      )}

      {next && (
        <Link href={`/aulas/${next.id}`} className="mt-6 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-line bg-card px-4 py-3 active:bg-paper">
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold tracking-wider text-mute uppercase">Próxima aula</span>
            <span className="block font-bold text-ink">{next.title}</span>
          </span>
          <ArrowRight size={20} className="shrink-0 text-brand-deep" />
        </Link>
      )}
    </>
  );
}
