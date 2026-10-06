'use client';

import { useCallback } from 'react';
import type { MoveRecord } from '@/core/chess/types';
import { playSound, type SoundName } from '@/services/sound';
import { useSettingsStore } from '@/stores/settings';

export function useSound() {
  const enabled = useSettingsStore((s) => s.sound);
  const play = useCallback((name: SoundName) => playSound(name, enabled), [enabled]);
  const playMove = useCallback(
    (m: MoveRecord) => playSound(m.isCheck ? 'check' : m.captured ? 'capture' : 'move', enabled),
    [enabled],
  );
  return { play, playMove };
}
