'use client';

import { create } from 'zustand';
import type { User } from '@/core/domain/types';
import { authService } from '@/services/auth';

interface SessionState {
  user: User | null;
  /** 'loading' até o servidor dizer se existe sessão. */
  status: 'loading' | 'ready';
  init: () => Promise<void>;
  register: (input: { email: string; password: string; nick: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'avatarColor'>>) => Promise<void>;
  /** Recarrega a conta do servidor (ex.: o Score mudou depois de uma partida online). */
  refresh: () => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
}

/** Conta logada. A sessão em si mora num cookie do servidor; aqui fica só o espelho. */
export const useSessionStore = create<SessionState>()((set, get) => ({
  user: null,
  status: 'loading',
  init: async () => {
    if (get().status === 'ready') return;
    try {
      set({ user: await authService.me(), status: 'ready' });
    } catch {
      set({ user: null, status: 'ready' });
    }
  },
  register: async (input) => set({ user: await authService.register(input) }),
  login: async (input) => set({ user: await authService.login(input) }),
  updateProfile: async (patch) => set({ user: await authService.updateProfile(patch) }),
  refresh: async () => {
    try {
      const user = await authService.me();
      if (user) set({ user });
    } catch {
      /* fica com o que tem */
    }
  },
  setUser: (user) => set({ user }),
  logout: async () => {
    try {
      await authService.logout();
    } finally {
      set({ user: null });
    }
  },
}));

export const isStaff = (user: User | null) => user?.role === 'professor' || user?.role === 'admin';
