'use client';

import { useEffect, useState } from 'react';
import type { Challenge, PlayerProgress, SavedPosition } from '@/core/domain/types';
import { api } from '@/services/api';
import { appStorage } from '@/services/storage';
import { useLabStore } from '@/stores/lab';
import { useProgressStore } from '@/stores/progress';
import { useActiveGameStore } from '@/stores/settings';

interface AccountData {
  progress: PlayerProgress | null;
  positions: SavedPosition[];
  customChallenges: Challenge[];
}

const OWNER_KEY = 'ligax:owner';

/** Zera os dados de jogo guardados neste aparelho. */
export function clearLocalAccountData(): void {
  useProgressStore.getState().reset();
  useLabStore.getState().replace({ positions: [], customChallenges: [] });
  useActiveGameStore.getState().clear();
  void appStorage.removeItem(OWNER_KEY);
}

/**
 * Mantém os dados de jogo da conta (progresso, posições, desafios criados)
 * iguais no servidor e no aparelho:
 *  - ao entrar, baixa o que está no servidor;
 *  - a cada mudança, envia de volta (com um pequeno atraso para juntar alterações).
 * O que fica no aparelho é só uma cópia para o app abrir rápido.
 * Devolve true quando os dados da conta já estão carregados.
 */
export function useAccountSync(userId: string | null): boolean {
  const [readyFor, setReadyFor] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribers: (() => void)[] = [];

    const push = () => {
      timer = null;
      const { positions, customChallenges } = useLabStore.getState();
      void api('/api/user-data', {
        method: 'PUT',
        body: { progress: useProgressStore.getState().progress, positions, customChallenges },
      }).catch(() => {
        /* sem conexão: a próxima alteração tenta de novo */
      });
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(push, 700);
    };

    (async () => {
      // dados de outra conta que tenham ficado neste aparelho não podem vazar para esta
      const sameOwner = (await appStorage.getItem(OWNER_KEY)) === userId;
      try {
        const { data } = await api<{ data: AccountData | null }>('/api/user-data');
        if (!alive) return;
        if (data?.progress) useProgressStore.getState().replace(data.progress);
        else useProgressStore.getState().reset();
        useLabStore.getState().replace({ positions: data?.positions ?? [], customChallenges: data?.customChallenges ?? [] });
        if (!sameOwner) useActiveGameStore.getState().clear();
      } catch {
        if (!alive) return;
        if (!sameOwner) clearLocalAccountData();
      }
      void appStorage.setItem(OWNER_KEY, userId);
      setReadyFor(userId);
      // só o progresso em si interessa (celebrações são efêmeras)
      let lastProgress = useProgressStore.getState().progress;
      unsubscribers.push(
        useProgressStore.subscribe((s) => {
          if (s.progress !== lastProgress) {
            lastProgress = s.progress;
            schedule();
          }
        }),
        useLabStore.subscribe(schedule),
      );
    })();

    return () => {
      alive = false;
      unsubscribers.forEach((u) => u());
      if (timer) {
        clearTimeout(timer);
        push(); // não perde a última alteração ao sair
      }
    };
  }, [userId]);

  return !!userId && readyFor === userId;
}
