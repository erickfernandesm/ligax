'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { CHALLENGE_TIERS, CHALLENGES } from '@/content/challenges';
import { isTierUnlocked } from '@/core/challenges';
import { useLabStore } from '@/stores/lab';
import { useProgressStore } from '@/stores/progress';
import { ChallengeScreen } from './ChallengeScreen';

export function ChallengeLoader() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const custom = useLabStore((s) => s.customChallenges);
  const solved = useProgressStore((s) => s.progress.challengesSolved);
  const celebrate = useProgressStore((s) => s.celebrate);

  const all = useMemo(() => [...CHALLENGES, ...custom], [custom]);
  const challenge = all.find((c) => c.id === challengeId);

  const unlockedTiers = CHALLENGE_TIERS.filter((t) => isTierUnlocked(t, CHALLENGE_TIERS, CHALLENGES, solved));
  const tierOpen = (tier: number) => tier === 0 || unlockedTiers.some((t) => t.tier === tier);
  const locked = challenge ? !tierOpen(challenge.tier) && !params.get('diario') : false;

  useEffect(() => {
    if (!challenge || locked) router.replace('/desafios');
  }, [challenge, locked, router]);

  // Um grupo novo abriu depois deste desafio? O Haroldo avisa.
  const previousCount = useRef(unlockedTiers.length);
  useEffect(() => {
    if (unlockedTiers.length > previousCount.current) {
      const opened = unlockedTiers[unlockedTiers.length - 1];
      celebrate({
        kind: 'haroldo',
        title: 'Novo desafio desbloqueado',
        text:
          opened.tier === CHALLENGE_TIERS[CHALLENGE_TIERS.length - 1].tier
            ? 'Agora quero ver se você realmente aprendeu.'
            : `Você liberou “${opened.title}”. ${opened.description}`,
      });
    }
    previousCount.current = unlockedTiers.length;
  }, [unlockedTiers, celebrate]);

  if (!challenge || locked) return null;

  const index = all.indexOf(challenge);
  const next = [...all.slice(index + 1), ...all.slice(0, index)].find((c) => !solved[c.id] && tierOpen(c.tier));

  return (
    <ChallengeScreen
      key={challenge.id}
      challenge={challenge}
      isDaily={!!params.get('diario')}
      nextHref={next ? `/desafio/${next.id}` : null}
    />
  );
}
