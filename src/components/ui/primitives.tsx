import type { ReactNode } from 'react';
import { cn } from './cn';

export function ProgressBar({
  value,
  tone = 'light',
  className,
  label,
}: {
  /** 0–1 */
  value: number;
  tone?: 'light' | 'night';
  className?: string;
  label?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2.5 overflow-hidden rounded-full', tone === 'light' ? 'bg-line' : 'bg-white/15', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700 ease-out',
          tone === 'light' ? 'bg-brand' : 'bg-lime',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    'inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors',
    active ? 'bg-night text-lime' : 'bg-card text-olive ring-1 ring-line',
    className,
  );
  if (!onClick) return <span className={cls}>{children}</span>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {children}
    </button>
  );
}

/** Etiqueta pequena (dificuldade, categoria, "novo"). */
export function Tag({ children, color, className }: { children: ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase',
        !color && 'bg-line text-olive',
        className,
      )}
      style={color ? { backgroundColor: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <h2 className="display text-[26px] text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="mb-3 text-mute">{icon}</div>}
      <p className="font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-mute">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Número grande com legenda — estatísticas. */
export function Stat({
  value,
  label,
  tone = 'light',
}: {
  value: ReactNode;
  label: string;
  tone?: 'light' | 'night';
}) {
  return (
    <div className="min-w-0">
      <div className={cn('display text-[34px]', tone === 'light' ? 'text-ink' : 'text-paper')}>{value}</div>
      <div className={cn('mt-0.5 text-xs font-medium', tone === 'light' ? 'text-mute' : 'text-paper/60')}>{label}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full min-h-12 rounded-xl border-2 border-line bg-card px-3.5 py-2.5 text-base text-ink placeholder:text-mute/70 focus:border-brand focus:outline-none';
