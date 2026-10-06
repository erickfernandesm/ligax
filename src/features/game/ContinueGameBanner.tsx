'use client';

import { Play } from 'lucide-react';
import Link from 'next/link';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { cn } from '@/components/ui/cn';
import { findBot } from '@/content/bots';
import { getCharacter } from '@/content/characters';
import { useActiveGameStore } from '@/stores/settings';

/** Aparece quando existe uma partida em andamento salva. */
export function ContinueGameBanner({ className }: { className?: string }) {
  const game = useActiveGameStore((s) => s.game);
  const bot = findBot(game?.botId);
  if (!game || !bot) return null;
  const c = getCharacter(bot.characterId);
  const moves = Math.ceil(game.moves.length / 2);
  return (
    <Link
      href="/partida?continuar=1"
      className={cn('flex items-center gap-3 rounded-3xl bg-lime/25 p-3 ring-1 ring-moss/50', className)}
    >
      <CharacterAvatar characterId={c.id} size={48} />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold tracking-wider text-brand-deep uppercase">Partida em andamento</span>
        <span className="block truncate font-bold text-ink">
          Contra o {c.name} · {moves === 0 ? 'no começo' : `lance ${moves}`}
        </span>
      </span>
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night text-lime">
        <Play size={18} fill="currentColor" />
      </span>
    </Link>
  );
}
