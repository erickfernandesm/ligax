'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { SEED_POSITIONS } from '@/content/lessons';
import type { Challenge, SavedPosition } from '@/core/domain/types';
import { appStorage, STORAGE_KEYS, uid } from '@/services/storage';

// Posições salvas ("Minhas posições") e desafios criados no Laboratório.
// Pertencem à conta: o hook useAccountSync mantém isto igual no servidor.

type PositionInput = Pick<SavedPosition, 'name' | 'description' | 'fen' | 'annotations' | 'moves'> & {
  id?: string;
};

interface LabState {
  positions: SavedPosition[];
  customChallenges: Challenge[];
  savePosition: (input: PositionInput) => SavedPosition;
  removePosition: (id: string) => void;
  addChallenge: (c: Challenge) => void;
  removeChallenge: (id: string) => void;
  /** Troca tudo pelos dados vindos do servidor. */
  replace: (data: { positions: SavedPosition[]; customChallenges: Challenge[] }) => void;
}

export const useLabStore = create<LabState>()(
  persist(
    (set, get) => ({
      positions: [],
      customChallenges: [],
      savePosition: (input) => {
        const date = new Date().toISOString();
        const existing = input.id ? get().positions.find((p) => p.id === input.id) : undefined;
        const position: SavedPosition = {
          ...input,
          id: existing?.id ?? uid('pos_'),
          name: input.name.trim() || 'Posição sem nome',
          source: 'user',
          createdAt: existing?.createdAt ?? date,
          updatedAt: date,
        };
        set((s) => ({
          positions: existing
            ? s.positions.map((p) => (p.id === position.id ? position : p))
            : [position, ...s.positions],
        }));
        return position;
      },
      removePosition: (id) => set((s) => ({ positions: s.positions.filter((p) => p.id !== id) })),
      addChallenge: (c) => set((s) => ({ customChallenges: [c, ...s.customChallenges] })),
      removeChallenge: (id) => set((s) => ({ customChallenges: s.customChallenges.filter((c) => c.id !== id) })),
      replace: (data) => set({ positions: data.positions, customChallenges: data.customChallenges }),
    }),
    { name: STORAGE_KEYS.lab, storage: createJSONStorage(() => appStorage), version: 2 },
  ),
);

/** Procura nas posições do usuário e nas oficiais da Liga. */
export function findPosition(userPositions: SavedPosition[], id: string | null | undefined): SavedPosition | undefined {
  if (!id) return undefined;
  return userPositions.find((p) => p.id === id) ?? SEED_POSITIONS.find((p) => p.id === id);
}
