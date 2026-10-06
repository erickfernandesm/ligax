'use client';

import { useEffect, useRef } from 'react';
import { PIECE_VALUE } from '@/core/chess/material';
import { type Color, type MoveRecord, type PieceType, makePiece } from '@/core/chess/types';
import { cn } from '@/components/ui/cn';
import { Sheet } from '@/components/ui/Sheet';
import { pieceImage } from './ChessBoard';

// ───────────────────────── Promoção ─────────────────────────

const PROMOTIONS: { piece: 'q' | 'r' | 'b' | 'n'; label: string }[] = [
  { piece: 'q', label: 'Dama' },
  { piece: 'r', label: 'Torre' },
  { piece: 'b', label: 'Bispo' },
  { piece: 'n', label: 'Cavalo' },
];

export function PromotionPicker({
  color,
  onChoose,
  onCancel,
}: {
  color: Color | null;
  onChoose: (piece: 'q' | 'r' | 'b' | 'n') => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={!!color} onClose={onCancel} title="Promover para">
      <div className="grid grid-cols-4 gap-2">
        {color &&
          PROMOTIONS.map((p) => (
            <button
              key={p.piece}
              type="button"
              onClick={() => onChoose(p.piece)}
              className="flex flex-col items-center gap-1 rounded-2xl bg-card p-2 ring-1 ring-line active:bg-lime/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pieceImage(makePiece(color, p.piece))} alt="" className="h-14 w-14" />
              <span className="text-xs font-bold text-olive">{p.label}</span>
            </button>
          ))}
      </div>
    </Sheet>
  );
}

// ───────────────────────── Peças capturadas ─────────────────────────

/** Peças que um lado capturou + vantagem material. */
export function CapturedRow({
  pieces,
  pieceColor,
  advantage,
  className,
}: {
  pieces: PieceType[];
  /** Cor das peças mostradas (as do adversário de quem capturou). */
  pieceColor: Color;
  advantage: number;
  className?: string;
}) {
  const sorted = [...pieces].sort((a, b) => PIECE_VALUE[b] - PIECE_VALUE[a]);
  return (
    <div className={cn('flex h-5 items-center', className)} aria-label="Peças capturadas">
      {sorted.map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={pieceImage(makePiece(pieceColor, t))} alt="" className="-mr-1.5 h-5 w-5" />
      ))}
      {advantage > 0 && <span className="ml-2.5 text-xs font-bold text-paper/70">+{advantage}</span>}
    </div>
  );
}

// ───────────────────────── Histórico de lances ─────────────────────────

interface MoveListProps {
  moves: MoveRecord[];
  /** Quantos lances estão "ativos" (análise com voltar/avançar). */
  cursor?: number;
  onSelect?: (ply: number) => void;
  /** Cor de quem joga primeiro na posição inicial. */
  firstColor?: Color;
  tone?: 'light' | 'night';
  layout?: 'rows' | 'inline';
  emptyText?: string;
  className?: string;
}

export function MoveList({
  moves,
  cursor,
  onSelect,
  firstColor = 'w',
  tone = 'night',
  layout = 'rows',
  emptyText = 'Nenhum lance ainda.',
  className,
}: MoveListProps) {
  const active = cursor ?? moves.length;
  const activeRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [active, moves.length]);

  if (moves.length === 0) {
    return <p className={cn('text-sm', tone === 'night' ? 'text-paper/50' : 'text-mute', className)}>{emptyText}</p>;
  }

  // agrupa em pares (brancas, pretas); se as pretas começam, o 1º par tem "..."
  const offset = firstColor === 'b' ? 1 : 0;
  const rows: { n: number; items: { ply: number; san: string }[] }[] = [];
  moves.forEach((m, i) => {
    const slot = i + offset;
    const row = Math.floor(slot / 2);
    if (!rows[row]) rows[row] = { n: row + 1, items: [] };
    rows[row].items.push({ ply: i + 1, san: m.san });
  });

  const cell = (item: { ply: number; san: string }) => {
    const isActive = item.ply === active;
    const cls = cn(
      'rounded-md px-1.5 py-1 text-left text-sm font-medium tabular-nums',
      isActive
        ? tone === 'night'
          ? 'bg-lime text-night'
          : 'bg-night text-lime'
        : tone === 'night'
          ? 'text-paper/85'
          : 'text-ink',
      item.ply > active && 'opacity-40',
    );
    const refCb = isActive ? (el: HTMLElement | null) => void (activeRef.current = el) : undefined;
    return onSelect ? (
      <button key={item.ply} ref={refCb} type="button" onClick={() => onSelect(item.ply)} className={cn(cls, 'min-h-9')}>
        {item.san}
      </button>
    ) : (
      <span key={item.ply} ref={refCb} className={cls}>
        {item.san}
      </span>
    );
  };

  if (layout === 'inline') {
    return (
      <div className={cn('no-scrollbar flex items-center gap-1 overflow-x-auto', className)}>
        {rows.map((r, i) => (
          <span key={r.n} className="flex shrink-0 items-center gap-0.5">
            <span className={cn('text-xs', tone === 'night' ? 'text-paper/40' : 'text-mute')}>
              {r.n}.{i === 0 && offset ? '..' : ''}
            </span>
            {r.items.map(cell)}
          </span>
        ))}
      </div>
    );
  }

  return (
    <ol className={cn('grid grid-cols-[2rem_1fr_1fr] items-center gap-x-1 gap-y-0.5', className)}>
      {rows.map((r, i) => (
        <li key={r.n} className="contents">
          <span className={cn('text-xs tabular-nums', tone === 'night' ? 'text-paper/40' : 'text-mute')}>{r.n}.</span>
          {i === 0 && offset ? <span className={tone === 'night' ? 'text-paper/40' : 'text-mute'}>…</span> : null}
          {r.items.map(cell)}
          {r.items.length + (i === 0 ? offset : 0) < 2 ? <span /> : null}
        </li>
      ))}
    </ol>
  );
}
