'use client';

import { useEffect, useState } from 'react';
import { ProgressBar } from '@/components/ui/primitives';
import { cn } from '@/components/ui/cn';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { HAROLDO_ID } from '@/content/characters';
import { AchievementIcon } from './AchievementIcon';
import type { Reward } from '@/core/domain/types';
import { findAchievement, getLevelInfo } from '@/core/progression';

/** Nível + barra de XP. */
export function XpBar({ xp, tone = 'light', className }: { xp: number; tone?: 'light' | 'night'; className?: string }) {
  const info = getLevelInfo(xp);
  return (
    <div className={className}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className={cn('display text-[34px]', tone === 'light' ? 'text-ink' : 'text-paper')}>Nível {info.level}</span>
          <span className={cn('text-xs font-bold tracking-wider uppercase', tone === 'light' ? 'text-brand-deep' : 'text-lime')}>
            {info.title}
          </span>
        </div>
        <span className={cn('pb-1 text-sm font-bold tabular-nums', tone === 'light' ? 'text-olive' : 'text-paper/75')}>
          {info.xp} / {info.nextLevelXp} XP
        </span>
      </div>
      <ProgressBar value={info.progress} tone={tone} className="mt-1.5" label="Progresso para o próximo nível" />
    </div>
  );
}

/** Número que sobe de 0 até o valor — o "+50 XP". */
export function CountUp({ value, durationMs = 700 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (value <= 0) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, durationMs]);
  return <>{shown}</>;
}

/**
 * Resumo de uma recompensa: XP ganho, barra de nível, subida de nível (com o
 * Haroldo) e conquistas. Usado no fim da partida, dos desafios e das lições.
 */
export function RewardSummary({
  reward,
  xpAfter,
  levelBar = true,
}: {
  reward: Reward;
  xpAfter: number;
  /** Partidas não dão XP: nelas a barra de nível fica de fora. */
  levelBar?: boolean;
}) {
  const leveledUp = reward.levelAfter > reward.levelBefore;
  // a barra começa no XP anterior e anima até o novo
  const [xp, setXp] = useState(xpAfter - reward.xpGained);
  useEffect(() => {
    const id = setTimeout(() => setXp(xpAfter), 350);
    return () => clearTimeout(id);
  }, [xpAfter]);

  return (
    <div className="w-full">
      {reward.xpGained > 0 && (
        <p className="display animate-pop text-center text-5xl text-lime">
          +<CountUp value={reward.xpGained} /> XP
        </p>
      )}
      {levelBar && <XpBar xp={xp} tone="night" className="mt-3" />}

      {leveledUp && (
        <div className="animate-rise mt-4 flex items-center gap-3 rounded-2xl bg-lime/15 p-3 ring-1 ring-lime/40">
          <CharacterAvatar characterId={HAROLDO_ID} size={48} />
          <div className="text-left">
            <p className="text-[11px] font-bold tracking-wider text-lime uppercase">Haroldo</p>
            <p className="font-bold text-paper">Você subiu para o nível {reward.levelAfter}!</p>
          </div>
        </div>
      )}

      {reward.newAchievements.length > 0 && (
        <ul className="mt-3 space-y-2">
          {reward.newAchievements.map((id) => {
            const a = findAchievement(id);
            if (!a) return null;
            return (
              <li key={id} className="animate-rise flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3 text-left">
                <AchievementIcon name={a.icon} tone="night" />
                <span>
                  <span className="block text-[11px] font-bold tracking-wider text-lime uppercase">
                    Nova conquista desbloqueada
                  </span>
                  <span className="block font-bold text-paper">{a.title}</span>
                  <span className="block text-sm text-paper/65">{a.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
