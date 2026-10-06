'use client';

import { Eraser, Hand, LayoutGrid, Redo2, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import { MARK_COLORS, pieceImage } from '@/components/board/ChessBoard';
import { IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { MARK_LABEL } from '@/core/chess/annotations';
import { EMPTY_FEN, PIECE_NAMES, START_FEN, type Color, type MarkColor, type PieceCode, pieceType } from '@/core/chess/types';
import type { Editor, Tool } from './useEditor';

const WHITE: PieceCode[] = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP'];
const BLACK: PieceCode[] = ['bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];
const MARKS: MarkColor[] = ['good', 'bad', 'warn', 'idea'];

/** Desfazer, refazer, girar, limpar, posição inicial e de quem é a vez. */
export function EditorToolbar({
  editor,
  onFlip,
  flipped,
}: {
  editor: Editor;
  onFlip: () => void;
  flipped: boolean;
}) {
  const turn = editor.state.turn;
  return (
    <div className="flex items-center [&>button]:max-[379px]:w-10">
      <IconButton label="Desfazer" tone="night" disabled={!editor.canUndo} onClick={editor.undo}>
        <Undo2 size={20} />
      </IconButton>
      <IconButton label="Refazer" tone="night" disabled={!editor.canRedo} onClick={editor.redo}>
        <Redo2 size={20} />
      </IconButton>
      <IconButton label="Trocar lado" tone="night" active={flipped} onClick={onFlip}>
        <RefreshCw size={20} />
      </IconButton>
      <IconButton label="Limpar tabuleiro" tone="night" onClick={() => editor.setBoardFromFen(EMPTY_FEN)}>
        <Trash2 size={20} />
      </IconButton>
      <IconButton label="Posição inicial" tone="night" onClick={() => editor.setBoardFromFen(START_FEN)}>
        <LayoutGrid size={20} />
      </IconButton>
      <TurnToggle turn={turn} onChange={editor.setTurn} className="ml-auto" />
    </div>
  );
}

/** "Quem começa?" — define o turno. */
export function TurnToggle({
  turn,
  onChange,
  className,
}: {
  turn: Color;
  onChange: (c: Color) => void;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label="Quem joga" className={cn('flex shrink-0 items-center rounded-xl bg-white/10 p-1', className)}>
      <span className="px-1.5 text-[11px] font-bold text-paper/60 uppercase max-[379px]:hidden">Vez</span>
      {(['w', 'b'] as Color[]).map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={turn === c}
          onClick={() => onChange(c)}
          aria-label={c === 'w' ? 'Brancas jogam' : 'Pretas jogam'}
          title={c === 'w' ? 'Brancas jogam' : 'Pretas jogam'}
          className={cn('flex h-10 w-10 items-center justify-center rounded-lg', turn === c ? 'bg-lime' : '')}
        >
          <span className={cn('h-4 w-4 rounded-full ring-1 ring-black/40', c === 'w' ? 'bg-white' : 'bg-black')} />
        </button>
      ))}
    </div>
  );
}

/** Painel de peças: seleciona a peça e toca na casa. */
export function PiecePalette({ tool, onTool }: { tool: Tool; onTool: (t: Tool) => void }) {
  const cell = 'flex aspect-square w-full items-center justify-center rounded-xl transition-colors';
  const row = (pieces: PieceCode[], first: React.ReactNode) => (
    <div className="grid grid-cols-7 gap-0.5">
      {first}
      {pieces.map((code) => {
        const active = tool.kind === 'piece' && tool.code === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            aria-label={`${PIECE_NAMES[pieceType(code)]} ${code[0] === 'w' ? 'branco' : 'preto'}`}
            onClick={() => onTool(active ? { kind: 'move' } : { kind: 'piece', code })}
            className={cn(cell, active ? 'bg-lime' : 'bg-white/10 active:bg-white/20')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pieceImage(code)} alt="" className="h-[82%] w-[82%]" draggable={false} />
          </button>
        );
      })}
    </div>
  );
  return (
    <div className="space-y-0.5" aria-label="Peças">
      {row(
        WHITE,
        <button
          type="button"
          aria-pressed={tool.kind === 'move'}
          aria-label="Mover peças"
          title="Mover peças"
          onClick={() => onTool({ kind: 'move' })}
          className={cn(cell, tool.kind === 'move' ? 'bg-lime text-night' : 'bg-white/10 text-paper')}
        >
          <Hand size={22} />
        </button>,
      )}
      {row(
        BLACK,
        <button
          type="button"
          aria-pressed={tool.kind === 'erase'}
          aria-label="Apagar peça"
          title="Apagar peça"
          onClick={() => onTool(tool.kind === 'erase' ? { kind: 'move' } : { kind: 'erase' })}
          className={cn(cell, tool.kind === 'erase' ? 'bg-lime text-night' : 'bg-white/10 text-paper')}
        >
          <Eraser size={22} />
        </button>,
      )}
    </div>
  );
}

/** Cores de marcação. Com uma cor ativa: toque = destacar casa, arrastar = seta. */
export function MarkPalette({
  color,
  onColor,
  onClear,
  canClear,
}: {
  color: MarkColor | null;
  onColor: (c: MarkColor | null) => void;
  onClear: () => void;
  canClear: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {MARKS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={color === c}
            aria-label={`Marcar: ${MARK_LABEL[c]}`}
            title={MARK_LABEL[c]}
            onClick={() => onColor(color === c ? null : c)}
            className={cn(
              'flex h-11 flex-1 items-center justify-center rounded-xl',
              color === c ? 'bg-white/25 ring-2 ring-white' : 'bg-white/10',
            )}
          >
            <span className="h-5 w-5 rounded-full" style={{ backgroundColor: MARK_COLORS[c] }} />
          </button>
        ))}
        <IconButton label="Apagar marcações" tone="night" disabled={!canClear} onClick={onClear}>
          <Eraser size={20} />
        </IconButton>
      </div>
      <p className="mt-1.5 min-h-4 text-xs text-paper/60">
        {color
          ? `${MARK_LABEL[color]}: toque numa casa para destacar ou arraste de uma casa a outra para desenhar a seta.`
          : 'Escolha uma cor para marcar casas e desenhar setas.'}
      </p>
    </div>
  );
}
