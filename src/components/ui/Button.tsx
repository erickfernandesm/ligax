import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'lime';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white shadow-[0_3px_0_var(--color-brand-deep)] active:shadow-none active:translate-y-[3px]',
  lime: 'bg-lime text-night shadow-[0_3px_0_#8fa600] active:shadow-none active:translate-y-[3px]',
  dark: 'bg-night text-paper active:bg-night-2',
  outline: 'border-2 border-line bg-card text-ink active:bg-paper',
  ghost: 'text-olive active:bg-black/5',
  danger: 'border-2 border-danger/30 bg-card text-danger active:bg-danger/10',
};

// Alturas pensadas para o dedo: nunca menos de 44px.
const SIZE: Record<Size, string> = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-12 px-5 text-[15px]',
  lg: 'min-h-14 px-6 text-base',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const base =
  'inline-flex min-w-0 items-center justify-center gap-2 rounded-2xl font-bold tracking-wide transition-[transform,background-color,box-shadow,opacity] duration-100 select-none disabled:opacity-45 disabled:shadow-none disabled:translate-y-0';

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  icon,
  children,
  className,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cn(base, VARIANT[variant], SIZE[size], block && 'w-full', className)} {...rest}>
      {icon}
      {children != null && <span className="truncate">{children}</span>}
    </button>
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  block,
  icon,
  children,
  className,
  replace,
}: CommonProps & { href: string; replace?: boolean }) {
  return (
    <Link
      href={href}
      replace={replace}
      className={cn(base, VARIANT[variant], SIZE[size], block && 'w-full', className)}
    >
      {icon}
      {children != null && <span className="truncate">{children}</span>}
    </Link>
  );
}

/** Botão quadrado só com ícone. `label` é obrigatório para leitores de tela. */
export function IconButton({
  label,
  children,
  active,
  tone = 'light',
  className,
  ...rest
}: {
  label: string;
  children: ReactNode;
  active?: boolean;
  tone?: 'light' | 'night';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-35',
        tone === 'light' && (active ? 'bg-night text-lime' : 'text-olive active:bg-black/10'),
        tone === 'night' && (active ? 'bg-lime text-night' : 'text-paper/80 active:bg-white/10'),
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
