'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ActiveGame } from '@/core/domain/types';
import { appStorage, STORAGE_KEYS } from '@/services/storage';

interface SettingsState {
  sound: boolean;
  showCoords: boolean;
  set: (patch: Partial<Pick<SettingsState, 'sound' | 'showCoords'>>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: true,
      showCoords: true,
      set: (patch) => set(patch),
    }),
    { name: STORAGE_KEYS.settings, storage: createJSONStorage(() => appStorage), version: 1 },
  ),
);

interface ActiveGameState {
  game: ActiveGame | null;
  save: (game: ActiveGame) => void;
  clear: () => void;
}

/** Partida em andamento, para o "Continuar jogando". */
export const useActiveGameStore = create<ActiveGameState>()(
  persist(
    (set) => ({
      game: null,
      save: (game) => set({ game }),
      clear: () => set({ game: null }),
    }),
    { name: STORAGE_KEYS.activeGame, storage: createJSONStorage(() => appStorage), version: 1 },
  ),
);
