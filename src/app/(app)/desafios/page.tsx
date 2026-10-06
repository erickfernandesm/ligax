'use client';

import { CalendarDays, Check, ChevronRight, Lock, Timer, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { cn } from '@/components/ui/cn';
import { ProgressBar, SectionTitle } from '@/components/ui/primitives';
import { CHALLENGE_TIERS, CHALLENGE_TYPE_LABEL, CHALLENGES } from '@/content/challenges';
import { HAROLDO_ID } from '@/content/characters';
import { DAILY_CHALLENGE_BONUS_XP } from '@/content/progression';
import { dailyChallenge, isTierUnlocked } from '@/core/challenges';
import type { Challenge } from '@/core/domain/types';
import { useLabStore } from '@/stores/lab';
import { useProgressStore } from '@/stores/progress';

export default function DesafiosPage() {
  const progress = useProgressStore((s) => s.progress);
  const custom = useLabStore((s) => s.customChallenges);
  const removeChallenge = useLabStore((s) => s.removeChallenge);
  const solved = progress.challengesSolved;

  const today = new Date().toISOString();
  const daily = dailyChallenge(CHALLENGES, today);
  const dailyDone = progress.lastDailyDate === today.slice(0, 10);
  const solvedCount = CHALLENGES.filter((c) => solved[c.id]).length;

  return (
    <>
      <PageHeader kicker="Modo Desafio" title="Desafios do Haroldo" />

      <section className="night-surface swoosh rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <CharacterAvatar characterId={HAROLDO_ID} size={60} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-wider text-lime uppercase">Haroldo</p>
            <p className="mt-1 text-[15px] leading-snug text-paper/90">
              {solvedCount === 0
                ? 'Cada posição aqui tem uma resposta. Seu trabalho é achar.'
                : solvedCount === CHALLENGES.length
                  ? 'Você resolveu todos. Respeito.'
                  : 'Tá indo bem. Mas os de baixo são outra conversa.'}
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={solvedCount / CHALLENGES.length} tone="night" className="flex-1" label="Desafios resolvidos" />
          <span className="text-sm font-bold text-paper tabular-nums">
            {solvedCount}/{CHALLENGES.length}
          </span>
        </div>
      </section>

      {daily && (
        <Link
          href={`/desafio/${daily.id}?diario=1`}
          className="mt-3 flex items-center gap-3 rounded-3xl bg-lime/25 p-4 ring-1 ring-moss/50"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-night text-lime">
            {dailyDone ? <Check size={24} strokeWidth={3} /> : <CalendarDays size={24} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold tracking-wider text-brand-deep uppercase">Desafio do dia</span>
            <span className="block font-bold text-ink">{daily.title}</span>
            <span className="block text-sm text-olive">
              {dailyDone ? 'Feito. Amanhã tem outro.' : `+${DAILY_CHALLENGE_BONUS_XP} XP de bônus hoje`}
            </span>
          </span>
          <ChevronRight size={20} className="text-olive" />
        </Link>
      )}

      {CHALLENGE_TIERS.map((tier, i) => {
        const items = CHALLENGES.filter((c) => c.tier === tier.tier);
        const unlocked = isTierUnlocked(tier, CHALLENGE_TIERS, CHALLENGES, solved);
        const previous = CHALLENGE_TIERS[i - 1];
        return (
          <section key={tier.tier} className="mt-8">
            <SectionTitle className="mb-1">{tier.title}</SectionTitle>
            <p className="mb-3 text-sm text-mute">
              {unlocked ? (
                tier.description
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <Lock size={14} />
                  Resolva {tier.unlockAfter} de “{previous?.title}” para liberar.
                </span>
              )}
            </p>
            <ul className={cn('overflow-hidden rounded-2xl bg-card', !unlocked && 'opacity-55')}>
              {items.map((c, k) => (
                <li key={c.id} className={cn(k > 0 && 'border-t border-line')}>
                  <ChallengeRow challenge={c} solved={!!solved[c.id]} locked={!unlocked} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {custom.length > 0 && (
        <section className="mt-8">
          <SectionTitle className="mb-1">Dos professores</SectionTitle>
          <p className="mb-3 text-sm text-mute">Desafios criados no Laboratório.</p>
          <ul className="overflow-hidden rounded-2xl bg-card">
            {custom.map((c, k) => (
              <li key={c.id} className={cn('flex items-center', k > 0 && 'border-t border-line')}>
                <div className="min-w-0 flex-1">
                  <ChallengeRow challenge={c} solved={!!solved[c.id]} locked={false} />
                </div>
                <button
                  type="button"
                  aria-label={`Excluir desafio ${c.title}`}
                  onClick={() => removeChallenge(c.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-mute active:text-danger"
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ChallengeRow({ challenge, solved, locked }: { challenge: Challenge; solved: boolean; locked: boolean }) {
  const content = (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
          solved ? 'bg-brand text-white' : 'bg-paper text-olive',
        )}
      >
        {solved ? <Check size={18} strokeWidth={3} /> : locked ? <Lock size={15} /> : challenge.timeLimitSec ? <Timer size={17} /> : '?'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-ink">{challenge.title}</span>
        <span className="block truncate text-sm text-mute">{CHALLENGE_TYPE_LABEL[challenge.type]}</span>
      </span>
      <span className="shrink-0 text-xs font-bold text-brand-deep">{solved ? 'Resolvido' : `+${challenge.xp} XP`}</span>
      {!locked && <ChevronRight size={18} className="shrink-0 text-mute" />}
    </>
  );
  const cls = 'flex min-h-[64px] items-center gap-3 px-4 py-3';
  if (locked) return <div className={cls}>{content}</div>;
  return (
    <Link href={`/desafio/${challenge.id}`} className={cn(cls, 'active:bg-paper')}>
      {content}
    </Link>
  );
}
