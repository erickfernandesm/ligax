'use client';

import { useEffect } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { HAROLDO_ID } from '@/content/characters';
import { AchievementIcon } from './AchievementIcon';
import { findAchievement, levelTitle } from '@/core/progression';
import { useSound } from '@/hooks/useSound';
import { useProgressStore, type Celebration } from '@/stores/progress';

/**
 * Momentos especiais, fora do fluxo normal das telas.
 * - Conquista: aviso rápido no topo, não interrompe.
 * - Nível novo / recado do Haroldo: tela cheia, com o dono da Liga.
 */
export function CelebrationHost() {
  const current = useProgressStore((s) => s.celebrations[0]);
  const dismiss = useProgressStore((s) => s.dismissCelebration);
  const { play } = useSound();

  useEffect(() => {
    if (!current) return;
    play('success');
    if (current.kind !== 'achievement') return;
    const id = setTimeout(dismiss, 3600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) return null;
  if (current.kind === 'achievement') return <AchievementToast celebration={current} onClose={dismiss} />;
  return <HaroldoMoment celebration={current} onClose={dismiss} />;
}

function AchievementToast({
  celebration,
  onClose,
}: {
  celebration: Extract<Celebration, { kind: 'achievement' }>;
  onClose: () => void;
}) {
  const a = findAchievement(celebration.achievementId);
  if (!a) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[max(env(safe-area-inset-top),12px)]">
      <button
        type="button"
        onClick={onClose}
        key={celebration.id}
        className="animate-rise night-surface pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-xl ring-1 ring-lime/40"
      >
        <AchievementIcon name={a.icon} tone="night" />
        <span className="min-w-0">
          <span className="block text-[11px] font-bold tracking-wider text-lime uppercase">Nova conquista desbloqueada</span>
          <span className="block truncate font-bold text-paper">{a.title}</span>
        </span>
      </button>
    </div>
  );
}

/** Estrutura visual dos momentos importantes: o Haroldo aparece. */
export function HaroldoMoment({
  celebration,
  onClose,
}: {
  celebration: Exclude<Celebration, { kind: 'achievement' }>;
  onClose: () => void;
}) {
  const isLevel = celebration.kind === 'level-up';
  return (
    <Sheet open onClose={onClose} variant="center" tone="night" dismissible={false}>
      <div className="relative flex flex-col items-center pt-6 text-center">
        <div className="rays pointer-events-none absolute -top-16 left-1/2 h-72 w-72 -translate-x-1/2" aria-hidden />
        <CharacterAvatar characterId={HAROLDO_ID} size={92} className="animate-pop relative" />
        <p className="relative mt-3 text-[11px] font-bold tracking-[0.2em] text-lime uppercase">Haroldo</p>
        {isLevel ? (
          <>
            <p className="relative mt-4 text-sm text-paper/70">Você chegou a um novo nível.</p>
            <p className="display animate-pop relative mt-1 text-[72px] text-lime">Nível {celebration.level}</p>
            <p className="relative text-sm font-bold tracking-wider text-paper/80 uppercase">
              {levelTitle(celebration.level)}
            </p>
          </>
        ) : (
          <>
            <p className="display relative mt-4 text-4xl text-paper">{celebration.title}</p>
            <p className="relative mt-2 text-[15px] leading-snug text-paper/80">{celebration.text}</p>
          </>
        )}
        <Button variant="lime" size="lg" block className="relative mt-7" onClick={onClose}>
          Continuar
        </Button>
      </div>
    </Sheet>
  );
}
