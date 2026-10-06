'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { validateFen } from 'chess.js';
import { findBot } from '@/content/bots';
import { START_FEN, type Color } from '@/core/chess/types';
import type { GameMode } from '@/core/domain/types';
import { uid } from '@/services/storage';
import { useActiveGameStore } from '@/stores/settings';
import { MatchScreen } from './MatchScreen';
import type { MatchConfig } from './useMatch';

const MODES: GameMode[] = ['treino', 'carreira', 'laboratorio'];

/**
 * Lê a URL e monta a configuração da partida:
 *   /partida?bot=tio-joao&modo=treino&cor=w        nova partida
 *   /partida?bot=...&modo=laboratorio&fen=...      a partir de uma posição
 *   /partida?continuar=1                           retoma a partida salva
 */
export function MatchLoader() {
  const params = useSearchParams();
  const router = useRouter();
  const [config] = useState<MatchConfig | null>(() => {
    if (params.get('continuar')) {
      const saved = useActiveGameStore.getState().game;
      const bot = findBot(saved?.botId);
      if (saved && bot) {
        return {
          id: saved.id,
          bot,
          mode: saved.mode,
          playerColor: saved.playerColor,
          startFen: saved.startFen,
          moves: saved.moves,
          startedAt: saved.startedAt,
        };
      }
      return null;
    }
    const bot = findBot(params.get('bot'));
    if (!bot) return null;
    const modeParam = params.get('modo') as GameMode | null;
    const mode: GameMode = modeParam && MODES.includes(modeParam) ? modeParam : 'treino';
    const fenParam = params.get('fen');
    const startFen = mode === 'laboratorio' && fenParam && validateFen(fenParam).ok ? fenParam : START_FEN;
    const cor = params.get('cor');
    const playerColor: Color = cor === 'b' ? 'b' : cor === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : 'w';
    return { id: uid('g_'), bot, mode, playerColor, startFen, moves: [], startedAt: new Date().toISOString() };
  });

  useEffect(() => {
    if (!config) router.replace('/jogar');
  }, [config, router]);

  if (!config) return null;
  return <MatchScreen config={config} />;
}
