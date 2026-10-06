'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FILES,
  PIECE_NAMES,
  type Annotations,
  type BoardMap,
  type Color,
  type MarkColor,
  type PieceCode,
  type Square,
  pieceColor,
  pieceType,
} from '@/core/chess/types';
import { reconcilePieces, type TrackedPiece } from '@/core/chess/pieces';
import { cn } from '@/components/ui/cn';

// ─────────────────────────────────────────────────────────────────────────────
// ChessBoard: o ÚNICO tabuleiro da plataforma. Partida, Ensino, Desafio,
// Laboratório, Modo Professor e Análise usam este mesmo componente — o que
// muda é só o que cada tela faz com os eventos.
//
// O componente não conhece regras de xadrez: recebe a posição e avisa toques,
// arrastos e traços. Quem decide o que é legal é quem usa.
// ─────────────────────────────────────────────────────────────────────────────

export const PIECE_SET = 'cburnett';
export const pieceImage = (code: PieceCode) => `/pieces/${PIECE_SET}/${code}.svg`;

export const MARK_COLORS: Record<MarkColor, string> = {
  good: 'var(--color-mark-good)',
  bad: 'var(--color-mark-bad)',
  warn: 'var(--color-mark-warn)',
  idea: 'var(--color-mark-idea)',
};

export interface BoardTarget {
  to: Square;
  capture?: boolean;
}

export interface ChessBoardProps {
  board: BoardMap;
  orientation?: Color;
  /** Toque/clique numa casa. */
  onSquareClick?: (square: Square) => void;
  /** Peça solta em outra casa (arrastar). */
  onPieceDrop?: (from: Square, to: Square) => void;
  /** Começo de um arrasto — útil para mostrar os destinos possíveis. */
  onDragStart?: (square: Square) => void;
  /** Quais peças podem ser arrastadas. */
  canDrag?: (square: Square, piece: PieceCode) => boolean;
  /**
   * Modo marcação: quando definido, toques e arrastos viram traços
   * (from === to é um toque na casa) em vez de mover peças.
   */
  onStroke?: (from: Square, to: Square) => void;
  selected?: Square | null;
  targets?: BoardTarget[];
  lastMove?: { from: Square; to: Square } | null;
  checkSquare?: Square | null;
  annotations?: Annotations;
  showCoords?: boolean;
  /** Animação curta de "não" (lance errado). Mude o valor para disparar. */
  shakeKey?: number;
  className?: string;
  'aria-label'?: string;
}

const coordsOf = (square: Square, orientation: Color) => {
  const f = square.charCodeAt(0) - 97;
  const r = Number(square[1]) - 1;
  return orientation === 'w' ? { x: f, y: 7 - r } : { x: 7 - f, y: r };
};

const squareAt = (x: number, y: number, orientation: Color): Square =>
  orientation === 'w' ? FILES[x] + (8 - y) : FILES[7 - x] + (y + 1);

const Piece = memo(function Piece({
  code,
  x,
  y,
  dragging,
  dx,
  dy,
}: {
  code: PieceCode;
  x: number;
  y: number;
  dragging: boolean;
  dx: number;
  dy: number;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-0 left-0 h-[12.5%] w-[12.5%] will-change-transform',
        dragging ? 'z-30' : 'z-10 transition-transform duration-200 ease-out',
      )}
      style={{
        transform: dragging
          ? `translate(calc(${x * 100}% + ${dx}px), calc(${y * 100}% + ${dy}px)) scale(1.18)`
          : `translate(${x * 100}%, ${y * 100}%)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pieceImage(code)}
        alt={`${PIECE_NAMES[pieceType(code)]} ${pieceColor(code) === 'w' ? 'branco' : 'preto'}`}
        draggable={false}
        className={cn('h-full w-full', dragging && 'drop-shadow-[0_6px_6px_rgba(0,0,0,0.35)]')}
      />
    </div>
  );
});

interface Gesture {
  pointerId: number;
  start: Square;
  startX: number;
  startY: number;
  moved: boolean;
  isTouch: boolean;
}

export function ChessBoard({
  board,
  orientation = 'w',
  onSquareClick,
  onPieceDrop,
  onDragStart,
  canDrag,
  onStroke,
  selected,
  targets,
  lastMove,
  checkSquare,
  annotations,
  showCoords = true,
  shakeKey,
  className,
  'aria-label': ariaLabel = 'Tabuleiro de xadrez',
}: ChessBoardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [drag, setDrag] = useState<{ square: Square; dx: number; dy: number } | null>(null);
  const [strokePreview, setStrokePreview] = useState<{ from: Square; to: Square } | null>(null);

  // Identidade estável das peças para animar o movimento.
  const idCounter = useRef(0);
  const tracked = useRef<TrackedPiece[]>([]);
  const pieces = useMemo(() => {
    tracked.current = reconcilePieces(tracked.current, board, () => ++idCounter.current);
    return tracked.current;
  }, [board]);

  const interactive = !!(onSquareClick || onStroke || onPieceDrop);

  const squareFromEvent = useCallback(
    (clientX: number, clientY: number): Square | null => {
      const el = ref.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const px = (clientX - rect.left) / rect.width;
      const py = (clientY - rect.top) / rect.height;
      if (px < 0 || px >= 1 || py < 0 || py >= 1) return null;
      return squareAt(Math.floor(px * 8), Math.floor(py * 8), orientation);
    },
    [orientation],
  );

  const endGesture = useCallback(() => {
    gesture.current = null;
    setDrag(null);
    setStrokePreview(null);
  }, []);

  // Se a posição mudar no meio de um arrasto (ex.: o bot jogou), cancela.
  useEffect(() => {
    if (gesture.current?.moved) endGesture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const square = squareFromEvent(e.clientX, e.clientY);
    if (!square) return;
    gesture.current = {
      pointerId: e.pointerId,
      start: square,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
      isTouch: e.pointerType !== 'mouse',
    };
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* alguns browsers recusam a captura: seguimos sem ela */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < (g.isTouch ? 10 : 5)) return;
      if (onStroke) {
        g.moved = true;
      } else {
        const piece = board[g.start];
        if (!piece || !onPieceDrop || (canDrag && !canDrag(g.start, piece))) return;
        g.moved = true;
        onDragStart?.(g.start);
      }
    }
    if (onStroke) {
      const to = squareFromEvent(e.clientX, e.clientY);
      setStrokePreview(to && to !== g.start ? { from: g.start, to } : null);
    } else {
      // no toque, a peça sobe um pouco para não ficar escondida pelo dedo
      setDrag({ square: g.start, dx, dy: dy - (g.isTouch ? 28 : 0) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const end = squareFromEvent(e.clientX, e.clientY);
    endGesture();
    if (onStroke) {
      if (end) onStroke(g.start, g.moved ? end : g.start);
      return;
    }
    if (g.moved) {
      if (end && end !== g.start) onPieceDrop?.(g.start, end);
      return;
    }
    if (end === g.start) onSquareClick?.(g.start);
  };

  const targetMap = useMemo(() => new Map((targets ?? []).map((t) => [t.to, t])), [targets]);
  const markMap = useMemo(
    () => new Map((annotations?.squares ?? []).map((s) => [s.square, s.color])),
    [annotations?.squares],
  );

  const cells = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const square = squareAt(x, y, orientation);
      const dark = (x + y) % 2 === 1;
      const isLast = lastMove && (lastMove.from === square || lastMove.to === square);
      const isSelected = selected === square;
      const target = targetMap.get(square);
      const mark = markMap.get(square);
      cells.push(
        <div
          key={square}
          data-square={square}
          className={cn('relative', dark ? 'bg-sq-dark' : 'bg-sq-light')}
        >
          {isLast && <span className="absolute inset-0 bg-lime/45" />}
          {isSelected && <span className="absolute inset-0 bg-lime/75" />}
          {checkSquare === square && (
            <span className="absolute inset-0 bg-[radial-gradient(circle,rgba(224,75,53,0.95)_0%,rgba(224,75,53,0.6)_45%,transparent_75%)]" />
          )}
          {mark && (
            <span
              className="absolute inset-[5%] rounded-[18%] opacity-70"
              style={{ backgroundColor: MARK_COLORS[mark], boxShadow: `0 0 0 2px ${MARK_COLORS[mark]}` }}
            />
          )}
          {target &&
            (target.capture ? (
              <span className="absolute inset-[4%] z-20 rounded-full border-[5px] border-night/30 sm:border-[6px]" />
            ) : (
              <span className="absolute top-1/2 left-1/2 z-20 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-night/30" />
            ))}
          {showCoords && x === 0 && (
            <span
              className={cn(
                'absolute top-[3%] left-[5%] text-[9px] leading-none font-bold sm:text-[11px]',
                dark ? 'text-sq-light' : 'text-sq-dark',
              )}
            >
              {square[1]}
            </span>
          )}
          {showCoords && y === 7 && (
            <span
              className={cn(
                'absolute right-[6%] bottom-[3%] text-[9px] leading-none font-bold sm:text-[11px]',
                dark ? 'text-sq-light' : 'text-sq-dark',
              )}
            >
              {square[0]}
            </span>
          )}
        </div>,
      );
    }
  }

  const arrows = [...(annotations?.arrows ?? [])];
  const preview = strokePreview;

  return (
    <div
      ref={ref}
      role="group"
      aria-label={ariaLabel}
      data-board
      key={shakeKey ? `s${shakeKey}` : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={endGesture}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        'relative aspect-square w-full overflow-hidden rounded-xl shadow-[0_6px_0_rgba(0,0,0,0.18)] select-none',
        shakeKey ? 'animate-shake' : undefined,
        className,
      )}
      style={{ touchAction: interactive ? 'none' : undefined, cursor: interactive ? 'pointer' : undefined }}
    >
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">{cells}</div>

      {pieces.map((p) => {
        const { x, y } = coordsOf(p.square, orientation);
        const dragging = drag?.square === p.square;
        return (
          <Piece
            key={p.id}
            code={p.code}
            x={x}
            y={y}
            dragging={dragging}
            dx={dragging ? drag!.dx : 0}
            dy={dragging ? drag!.dy : 0}
          />
        );
      })}

      {(arrows.length > 0 || preview) && (
        <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 z-20 h-full w-full" aria-hidden>
          {arrows.map((a, i) => (
            <Arrow key={`${a.from}${a.to}${a.color}${i}`} from={a.from} to={a.to} color={MARK_COLORS[a.color]} orientation={orientation} />
          ))}
          {preview && (
            <Arrow from={preview.from} to={preview.to} color="rgba(28,31,21,0.55)" orientation={orientation} />
          )}
        </svg>
      )}
    </div>
  );
}

function Arrow({ from, to, color, orientation }: { from: Square; to: Square; color: string; orientation: Color }) {
  const a = coordsOf(from, orientation);
  const b = coordsOf(to, orientation);
  const x1 = a.x + 0.5;
  const y1 = a.y + 0.5;
  const x2 = b.x + 0.5;
  const y2 = b.y + 0.5;
  const len = Math.hypot(x2 - x1, y2 - y1);
  if (len === 0) return null;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const head = 0.34;
  const width = 0.17;
  // corpo começa um pouco fora do centro e termina na base da ponta
  const sx = x1 + ux * 0.28;
  const sy = y1 + uy * 0.28;
  const ex = x2 - ux * head;
  const ey = y2 - uy * head;
  const px = -uy;
  const py = ux;
  const points = [
    [x2, y2],
    [ex + px * head * 0.62, ey + py * head * 0.62],
    [ex - px * head * 0.62, ey - py * head * 0.62],
  ]
    .map((p) => p.join(','))
    .join(' ');
  return (
    <g opacity={0.85}>
      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <polygon points={points} fill={color} />
    </g>
  );
}
