'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PlayerProgress, Reward } from '@/core/domain/types';
import {
  applyChallengeSolved,
  applyCheckGiven,
  applyGameResult,
  applyLessonCompleted,
  applyPositionSaved,
  applyTeachCompleted,
  createInitialProgress,
  type GameResultInput,
} from '@/core/progression';
import { appStorage, STORAGE_KEYS, uid } from '@/services/storage';

/** Momentos que merecem aparecer na tela (nível novo, conquista, recado do Haroldo). */
export type Celebration =
  | { id: string; kind: 'level-up'; level: number }
  | { id: string; kind: 'achievement'; achievementId: string }
  | { id: string; kind: 'haroldo'; title: string; text: string };

/** Celebration sem o id (o Omit comum não distribui sobre a união). */
export type CelebrationInput = Celebration extends infer C ? (C extends { id: string } ? Omit<C, 'id'> : never) : never;

interface ProgressState {
  progress: PlayerProgress;
  celebrations: Celebration[];
  /** Registra uma partida. Quem chama mostra a recompensa (tela de resultado). */
  recordGame: (input: Omit<GameResultInput, 'date'>) => Reward;
  recordCheck: () => void;
  solveChallenge: (challenge: { id: string; xp: number }, isDaily: boolean) => Reward;
  completeTeachModule: (module: { id: string; xp: number }) => Reward;
  completeLesson: (lessonId: string) => Reward;
  recordPositionSaved: () => void;
  celebrate: (c: CelebrationInput) => void;
  dismissCelebration: () => void;
  /** Troca o progresso pelo que veio do servidor (ao entrar na conta). */
  replace: (progress: PlayerProgress) => void;
  reset: () => void;
}

const now = () => new Date().toISOString();

function rewardCelebrations(reward: Reward): Celebration[] {
  const list: Celebration[] = [];
  if (reward.levelAfter > reward.levelBefore) {
    list.push({ id: uid('c_'), kind: 'level-up', level: reward.levelAfter });
  }
  for (const achievementId of reward.newAchievements) {
    list.push({ id: uid('c_'), kind: 'achievement', achievementId });
  }
  return list;
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => {
      /** Aplica uma regra de progressão e, se pedido, enfileira as celebrações. */
      const commit = (result: { progress: PlayerProgress; reward: Reward }, announce: boolean): Reward => {
        set((s) => ({
          progress: result.progress,
          celebrations: announce ? [...s.celebrations, ...rewardCelebrations(result.reward)] : s.celebrations,
        }));
        return result.reward;
      };
      return {
        progress: createInitialProgress(),
        celebrations: [],
        recordGame: (input) => commit(applyGameResult(get().progress, { ...input, date: now() }), false),
        recordCheck: () => void commit(applyCheckGiven(get().progress, now()), true),
        solveChallenge: (challenge, isDaily) =>
          commit(applyChallengeSolved(get().progress, challenge, { date: now(), isDaily }), true),
        completeTeachModule: (module) => commit(applyTeachCompleted(get().progress, module, now()), true),
        completeLesson: (lessonId) => commit(applyLessonCompleted(get().progress, lessonId, now()), true),
        recordPositionSaved: () => void commit(applyPositionSaved(get().progress, now()), true),
        celebrate: (c) =>
          set((s) => ({ celebrations: [...s.celebrations, { ...c, id: uid('c_') } as Celebration] })),
        dismissCelebration: () => set((s) => ({ celebrations: s.celebrations.slice(1) })),
        replace: (progress) => {
          const base = createInitialProgress();
          set({
            progress: { ...base, ...progress, stats: { ...base.stats, ...progress.stats }, career: { ...base.career, ...progress.career } },
            celebrations: [],
          });
        },
        reset: () => set({ progress: createInitialProgress(), celebrations: [] }),
      };
    },
    {
      name: STORAGE_KEYS.progress,
      storage: createJSONStorage(() => appStorage),
      version: 1,
      partialize: (s) => ({ progress: s.progress }),
      // garante campos novos em dados salvos por versões antigas
      merge: (persisted, current) => {
        const saved = (persisted as { progress?: Partial<PlayerProgress> } | undefined)?.progress;
        const base = createInitialProgress();
        return {
          ...current,
          progress: saved
            ? { ...base, ...saved, stats: { ...base.stats, ...saved.stats }, career: { ...base.career, ...saved.career } }
            : base,
        };
      },
    },
  ),
);
