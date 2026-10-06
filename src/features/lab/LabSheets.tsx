'use client';

import { Copy, Dices, FolderOpen, Play, Share2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { EmptyState, Field, inputClass } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { BOTS, randomBot } from '@/content/bots';
import { getCharacter } from '@/content/characters';
import { SEED_POSITIONS } from '@/content/lessons';
import { parseFenInput } from '@/core/chess/fen';
import type { BoardMap, Color } from '@/core/chess/types';
import type { SavedPosition } from '@/core/domain/types';
import { ColorPicker } from '@/features/game/OpponentPicker';
import { useLabStore } from '@/stores/lab';

// ───────────────────────── Salvar ─────────────────────────

export function SaveSheet({
  open,
  onClose,
  initialName,
  initialDescription,
  isUpdate,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initialName: string;
  initialDescription: string;
  isUpdate: boolean;
  onSave: (name: string, description: string, asCopy: boolean) => void;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  useEffect(() => {
    if (open) {
      setName(initialName);
      setDescription(initialDescription);
    }
  }, [open, initialName, initialDescription]);

  return (
    <Sheet open={open} onClose={onClose} title="Salvar posição">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name, description, false);
        }}
      >
        <Field label="Nome">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Mate em 2, Final de Torre..."
            maxLength={60}
          />
        </Field>
        <Field label="Descrição" hint="Opcional. Ajuda a lembrar por que você guardou.">
          <textarea
            className={cn(inputClass, 'min-h-20 resize-none')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </Field>
        <p className="text-xs text-mute">Peças, turno, marcações e lances da análise são salvos juntos.</p>
        <div className="flex gap-2">
          {isUpdate && (
            <Button variant="outline" className="flex-1" onClick={() => onSave(name, description, true)}>
              Salvar como nova
            </Button>
          )}
          <Button type="submit" className="flex-1">
            {isUpdate ? 'Atualizar' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

// ───────────────────────── Minhas posições ─────────────────────────

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

export function PositionsSheet({
  open,
  onClose,
  onOpen,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: (p: SavedPosition) => void;
  onShare: (p: SavedPosition) => void;
}) {
  const positions = useLabStore((s) => s.positions);
  const removePosition = useLabStore((s) => s.removePosition);
  const [tab, setTab] = useState<'mine' | 'liga'>('mine');
  const list = tab === 'mine' ? positions : SEED_POSITIONS;

  return (
    <Sheet open={open} onClose={onClose} title="Posições">
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-line p-1">
        {(
          [
            ['mine', `Minhas (${positions.length})`],
            ['liga', 'Da Liga X'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn('min-h-10 rounded-lg text-sm font-bold', tab === value ? 'bg-card text-ink' : 'text-olive')}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={30} />}
          title="Nada salvo ainda"
          text="Monte uma posição e toque em Salvar para ela aparecer aqui."
        />
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-1 rounded-2xl bg-card p-1.5 pl-3">
              <button type="button" onClick={() => onOpen(p)} className="min-h-12 min-w-0 flex-1 py-1 text-left">
                <span className="block leading-tight font-bold break-words text-ink">{p.name}</span>
                <span className="line-clamp-2 text-xs leading-snug text-mute">
                  {p.source === 'user' ? formatDate(p.updatedAt) : 'Liga X'}
                  {p.description && ` · ${p.description}`}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Compartilhar ${p.name}`}
                onClick={() => onShare(p)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-olive active:bg-paper"
              >
                <Share2 size={18} />
              </button>
              {p.source === 'user' && (
                <button
                  type="button"
                  aria-label={`Excluir ${p.name}`}
                  onClick={() => removePosition(p.id)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-mute active:text-danger"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

// ───────────────────────── FEN ─────────────────────────

export function FenSheet({
  open,
  onClose,
  fen,
  onImport,
  onCopied,
}: {
  open: boolean;
  onClose: () => void;
  fen: string;
  onImport: (board: BoardMap, turn: Color) => void;
  onCopied: () => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState(false);
  useEffect(() => {
    if (open) {
      setText('');
      setError(false);
    }
  }, [open]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fen);
      onCopied();
    } catch {
      /* sem acesso à área de transferência: o texto continua selecionável */
    }
  };

  const load = () => {
    const parsed = parseFenInput(text);
    if (!parsed) return setError(true);
    onImport(parsed.board, parsed.turn);
  };

  return (
    <Sheet open={open} onClose={onClose} title="FEN">
      <p className="text-sm text-olive">FEN é o jeito padrão de escrever uma posição em uma linha de texto.</p>
      <p className="mt-4 mb-1.5 text-sm font-bold text-ink">Exportar esta posição</p>
      <div className="flex gap-2">
        <code className="min-w-0 flex-1 rounded-xl bg-card px-3 py-3 font-mono text-xs break-all text-ink select-all">{fen}</code>
        <Button variant="outline" aria-label="Copiar FEN" onClick={copy} icon={<Copy size={18} />} />
      </div>
      <div className="mt-5">
        <Field label="Importar posição por FEN">
          <textarea
            className={cn(inputClass, 'min-h-20 resize-none font-mono text-sm', error && 'border-danger')}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError(false);
            }}
            placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </Field>
        {error && (
          <p role="alert" className="mt-1.5 text-sm font-bold text-danger">
            Esse FEN não é válido. Confira se são 8 fileiras separadas por barra.
          </p>
        )}
        <Button block className="mt-3" disabled={!text.trim()} onClick={load}>
          Carregar posição
        </Button>
      </div>
    </Sheet>
  );
}

// ───────────────────────── Jogar a partir daqui ─────────────────────────

export function PlayFromHereSheet({
  open,
  onClose,
  fen,
  sideToMove,
}: {
  open: boolean;
  onClose: () => void;
  fen: string;
  sideToMove: Color;
}) {
  const router = useRouter();
  const [botId, setBotId] = useState<string>(BOTS[0].id);
  const [color, setColor] = useState<'w' | 'b' | 'r'>(sideToMove);
  useEffect(() => {
    if (open) setColor(sideToMove);
  }, [open, sideToMove]);

  const start = () => {
    const bot = botId === 'random' ? randomBot() : BOTS.find((b) => b.id === botId)!;
    const q = new URLSearchParams({ bot: bot.id, modo: 'laboratorio', cor: color, fen });
    router.push(`/partida?${q.toString()}`);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Jogar a partir daqui">
      <p className="text-sm text-olive">
        A partida começa exatamente nessa posição. {sideToMove === 'w' ? 'Brancas' : 'Pretas'} jogam primeiro.
      </p>
      <p className="mt-4 mb-2 text-sm font-bold text-ink">Contra quem?</p>
      <div className="grid grid-cols-5 gap-1.5 max-[379px]:grid-cols-3">
        {BOTS.map((bot) => {
          const c = getCharacter(bot.characterId);
          const active = botId === bot.id;
          return (
            <button
              key={bot.id}
              type="button"
              aria-pressed={active}
              onClick={() => setBotId(bot.id)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2',
                active ? 'border-brand bg-brand/10' : 'border-transparent',
              )}
            >
              <CharacterAvatar characterId={c.id} size={44} ring={active} />
              <span className="text-[11px] leading-tight font-bold text-ink">{c.name.replace('Tio ', '')}</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={botId === 'random'}
          onClick={() => setBotId('random')}
          className={cn(
            'flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-2',
            botId === 'random' ? 'border-brand bg-brand/10' : 'border-transparent',
          )}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-night text-lime">
            <Dices size={22} />
          </span>
          <span className="text-[11px] leading-tight font-bold text-ink">Sorteio</span>
        </button>
      </div>
      <p className="mt-4 mb-2 text-sm font-bold text-ink">Você joga de</p>
      <ColorPicker value={color} onChange={setColor} />
      <Button size="lg" block className="mt-5" icon={<Play size={18} fill="currentColor" />} onClick={start}>
        Começar
      </Button>
    </Sheet>
  );
}

// ───────────────────────── Criar desafio ─────────────────────────

export function ChallengeSheet({
  open,
  onClose,
  solution,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  solution: string[];
  onCreate: (title: string, prompt: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  useEffect(() => {
    if (open) {
      setTitle('');
      setPrompt('');
    }
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="Criar desafio">
      {solution.length === 0 ? (
        <p className="text-[15px] text-olive">
          Primeiro jogue a solução no tabuleiro, no modo Analisar. Os lances que você fizer viram a resposta do desafio.
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onCreate(title, prompt);
          }}
        >
          <div className="rounded-xl bg-card px-3 py-2.5">
            <p className="text-xs font-bold text-mute uppercase">Solução (o que você jogou)</p>
            <p className="mt-0.5 text-sm font-bold text-ink">{solution.join(' ')}</p>
          </div>
          <Field label="Nome do desafio">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Ataque ao Rei"
              maxLength={50}
              required
            />
          </Field>
          <Field label="Objetivo" hint="Opcional. Se ficar vazio, a gente escreve um padrão.">
            <input
              className={inputClass}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex.: Brancas jogam. Encontre o melhor lance."
              maxLength={90}
            />
          </Field>
          <Button type="submit" block>
            Salvar como desafio
          </Button>
        </form>
      )}
    </Sheet>
  );
}
