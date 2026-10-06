'use client';

import { Dices, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { pieceImage } from '@/components/board/ChessBoard';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Tag } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { BOTS, randomBot } from '@/content/bots';
import { getCharacter } from '@/content/characters';
import type { Bot, GameMode } from '@/core/domain/types';

/** Card de um adversário. Serve para qualquer bot cadastrado em content/bots.ts. */
export function BotCard({ bot, onPlay }: { bot: Bot; onPlay: () => void }) {
  const c = getCharacter(bot.characterId);
  return (
    <article className="relative overflow-hidden rounded-3xl bg-card p-4 pl-5">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: c.accent }} aria-hidden />
      <div className="flex gap-4">
        <CharacterAvatar characterId={c.id} size={76} shape="rounded" ring={false} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Tag color={c.accent}>{bot.difficultyLabel}</Tag>
            <span className="text-xs font-bold text-mute">Nível {bot.level}</span>
          </div>
          <h3 className="display mt-1 text-[28px] text-ink">{c.name}</h3>
          <p className="text-sm leading-snug text-olive">{bot.playStyle}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-snug text-mute">{bot.pitch}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-brand-deep">
          {bot.recommendedForBeginners ? 'Recomendado pra começar' : ''}
        </span>
        <Button size="sm" icon={<Play size={16} fill="currentColor" />} onClick={onPlay} aria-label={`Jogar contra ${c.name}`}>
          Jogar
        </Button>
      </div>
    </article>
  );
}

type ColorChoice = 'w' | 'b' | 'r';

const COLOR_OPTIONS: { value: ColorChoice; label: string }[] = [
  { value: 'w', label: 'Brancas' },
  { value: 'r', label: 'Sorteio' },
  { value: 'b', label: 'Pretas' },
];

export function ColorPicker({ value, onChange }: { value: ColorChoice; onChange: (c: ColorChoice) => void }) {
  return (
    <div role="radiogroup" aria-label="Sua cor" className="grid grid-cols-3 gap-2">
      {COLOR_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-bold',
            value === o.value ? 'border-brand bg-brand/10 text-ink' : 'border-line bg-card text-olive',
          )}
        >
          {o.value === 'r' ? (
            <Dices size={30} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pieceImage(o.value === 'w' ? 'wK' : 'bK')} alt="" className="h-9 w-9" />
          )}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Confirmação antes da partida: quem é o adversário e com que cor jogar. */
export function StartMatchSheet({
  bot,
  mode,
  randomPick,
  onClose,
  fen,
}: {
  bot: Bot | null;
  mode: GameMode;
  /** O bot foi sorteado ("Partida aleatória"). */
  randomPick?: boolean;
  onClose: () => void;
  /** Posição inicial personalizada (Laboratório). */
  fen?: string;
}) {
  const router = useRouter();
  const [color, setColor] = useState<ColorChoice>('w');
  if (!bot) return null;
  const c = getCharacter(bot.characterId);

  const start = () => {
    const q = new URLSearchParams({ bot: bot.id, modo: mode, cor: color });
    if (fen) q.set('fen', fen);
    router.push(`/partida?${q.toString()}`);
  };

  return (
    <Sheet open onClose={onClose} title={randomPick ? `Saiu o ${c.name}!` : `Vai encarar o ${c.name}?`}>
      <div className="flex items-center gap-3">
        <CharacterAvatar characterId={c.id} size={64} />
        <div className="min-w-0">
          <p className="text-[15px] leading-snug text-ink">“{c.tagline}”</p>
          <p className="mt-1 text-xs font-bold text-mute">
            {bot.difficultyLabel} · Nível {bot.level}
          </p>
        </div>
      </div>
      <p className="mt-5 mb-2 text-sm font-bold text-ink">Você joga de</p>
      <ColorPicker value={color} onChange={setColor} />
      <Button size="lg" block className="mt-5" onClick={start} icon={<Play size={18} fill="currentColor" />}>
        Começar partida
      </Button>
    </Sheet>
  );
}

/** Lista de adversários + partida aleatória. Usada no Treino. */
export function OpponentPicker({ mode }: { mode: GameMode }) {
  const [picked, setPicked] = useState<{ bot: Bot; random: boolean } | null>(null);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {BOTS.map((bot) => (
          <BotCard key={bot.id} bot={bot} onPlay={() => setPicked({ bot, random: false })} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setPicked({ bot: randomBot(), random: true })}
        className="night-surface swoosh mt-3 flex w-full items-center gap-4 rounded-3xl p-4 text-left"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime text-night">
          <Dices size={30} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="display block text-[26px] text-paper">Partida aleatória</span>
          <span className="block text-sm text-paper/70">A gente sorteia. Você descobre na hora.</span>
        </span>
      </button>

      <StartMatchSheet
        key={picked?.bot.id ?? 'none'}
        bot={picked?.bot ?? null}
        randomPick={picked?.random}
        mode={mode}
        onClose={() => setPicked(null)}
      />
    </>
  );
}
