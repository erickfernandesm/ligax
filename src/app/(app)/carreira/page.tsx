'use client';

import { Check, Lock, Play } from 'lucide-react';
import { useState } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { SectionTitle, Stat } from '@/components/ui/primitives';
import { BOTS, getBot } from '@/content/bots';
import { getCharacter, HAROLDO_ID } from '@/content/characters';
import type { Bot } from '@/core/domain/types';
import { getCareerView, winRate } from '@/core/progression';
import { ContinueGameBanner } from '@/features/game/ContinueGameBanner';
import { StartMatchSheet } from '@/features/game/OpponentPicker';
import { useProgressStore } from '@/stores/progress';

export default function CarreiraPage() {
  const progress = useProgressStore((s) => s.progress);
  const career = getCareerView(progress);
  const [picked, setPicked] = useState<Bot | null>(null);
  const { stats } = progress;

  return (
    <>
      <PageHeader kicker="Modo Carreira" title="Sua subida na Liga" />

      <section className="night-surface swoosh rounded-3xl p-5">
        <p className="display text-[34px] text-paper">
          {career.completed ? 'Campeão da Liga' : `Etapa ${progress.career.stageIndex + 1} de ${career.stages.length}`}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <CharacterAvatar characterId={HAROLDO_ID} size={44} />
          <p className="text-sm leading-snug text-paper/85">
            {career.completed
              ? 'Você venceu todo mundo da casa. Agora é manter o nível.'
              : `Próxima etapa: ${career.current?.title}. ${career.current?.description}`}
          </p>
        </div>
      </section>

      <ContinueGameBanner className="mt-4" />

      <SectionTitle className="mt-7">Etapas</SectionTitle>
      <ol className="relative">
        {career.stages.map(({ stage, state, wins }, i) => {
          const bot = getBot(stage.botId);
          const c = getCharacter(bot.characterId);
          const last = i === career.stages.length - 1;
          return (
            <li key={stage.id} className="relative flex gap-4 pb-5">
              {!last && (
                <span
                  aria-hidden
                  className={cn('absolute top-14 bottom-0 left-[27px] w-1 rounded-full', state === 'done' ? 'bg-brand' : 'bg-line')}
                />
              )}
              <div className="relative shrink-0">
                <CharacterAvatar
                  characterId={c.id}
                  size={56}
                  className={cn(state === 'locked' && 'opacity-45 grayscale')}
                  accent={state === 'locked' ? '#c9cbbd' : undefined}
                />
                {state !== 'current' && (
                  <span
                    className={cn(
                      'absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-paper',
                      state === 'done' ? 'bg-brand text-white' : 'bg-line text-mute',
                    )}
                  >
                    {state === 'done' ? <Check size={14} strokeWidth={3} /> : <Lock size={12} />}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'min-w-0 flex-1 rounded-2xl p-3.5',
                  state === 'current' ? 'bg-card ring-2 ring-brand' : 'bg-card/60',
                )}
              >
                <p className="text-[11px] font-bold tracking-wider text-mute uppercase">
                  Etapa {i + 1} · {c.name}
                </p>
                <h3 className={cn('display text-2xl', state === 'locked' ? 'text-mute' : 'text-ink')}>{stage.title}</h3>
                <div className="mt-1.5 flex items-center gap-1.5" aria-label={`${wins} de ${stage.winsToAdvance} vitórias`}>
                  {Array.from({ length: stage.winsToAdvance }).map((_, k) => (
                    <span key={k} className={cn('h-2.5 w-7 rounded-full', k < wins ? 'bg-brand' : 'bg-line')} />
                  ))}
                  <span className="ml-1 text-xs font-bold text-mute">
                    {wins}/{stage.winsToAdvance} vitórias
                  </span>
                </div>
                {state === 'current' && (
                  <Button
                    block
                    className="mt-3"
                    icon={<Play size={16} fill="currentColor" />}
                    onClick={() => setPicked(bot)}
                  >
                    Jogar
                  </Button>
                )}
                {state === 'locked' && <p className="mt-1 text-sm text-mute">Vença a etapa anterior para liberar.</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {career.completed && (
        <>
          <SectionTitle className="mt-4">Defenda o título</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {BOTS.map((bot) => (
              <Button key={bot.id} variant="outline" onClick={() => setPicked(bot)}>
                {getCharacter(bot.characterId).name}
              </Button>
            ))}
          </div>
        </>
      )}

      <SectionTitle className="mt-7">Seus números</SectionTitle>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 rounded-3xl bg-card p-5">
        <Stat value={stats.games} label="Partidas" />
        <Stat value={stats.wins} label="Vitórias" />
        <Stat value={stats.losses} label="Derrotas" />
        <Stat value={stats.draws} label="Empates" />
        <Stat value={`${winRate(progress)}%`} label="Aproveitamento" />
        <Stat value={stats.currentStreak} label="Sequência" />
      </div>

      <StartMatchSheet key={picked?.id ?? 'none'} bot={picked} mode="carreira" onClose={() => setPicked(null)} />
    </>
  );
}
