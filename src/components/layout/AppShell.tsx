'use client';

import { BookOpen, FlaskConical, Home, Swords, Target, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';
import { getLevelInfo } from '@/core/progression';
import { useProgressStore } from '@/stores/progress';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Início', icon: Home, match: ['/'] },
  { href: '/jogar', label: 'Jogar', icon: Swords, match: ['/jogar', '/carreira', '/amigo'] },
  { href: '/aprender', label: 'Aprender', icon: BookOpen, match: ['/aprender', '/aulas', '/professores'] },
  { href: '/desafios', label: 'Desafios', icon: Target, match: ['/desafios'] },
  { href: '/perfil', label: 'Perfil', icon: User, match: ['/perfil', '/admin'] },
] as const;

function isActive(pathname: string, match: readonly string[]) {
  return match.some((m) => (m === '/' ? pathname === '/' : pathname === m || pathname.startsWith(m + '/')));
}

/** Casca das telas "de navegação": barra inferior no celular, trilho lateral no desktop. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const xp = useProgressStore((s) => s.progress.xp);
  const level = getLevelInfo(xp);

  return (
    <div className="min-h-dvh lg:pl-60">
      {/* Trilho lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-card px-4 py-6 lg:flex">
        <Link href="/" aria-label="Início">
          <Logo height={46} />
        </Link>
        <nav className="mt-8 flex flex-col gap-1" aria-label="Principal">
          {NAV.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold transition-colors',
                  active ? 'bg-night text-lime' : 'text-olive hover:bg-paper',
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/laboratorio"
            className="mt-3 flex min-h-12 items-center gap-3 rounded-xl px-3 font-bold text-olive hover:bg-paper"
          >
            <FlaskConical size={20} />
            Laboratório
          </Link>
        </nav>
        <Link href="/perfil" className="mt-auto rounded-2xl bg-paper p-3">
          <span className="display text-xl text-ink">Nível {level.level}</span>
          <span className="ml-2 text-xs font-bold text-mute uppercase">{level.title}</span>
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-brand" style={{ width: `${level.progress * 100}%` }} />
          </span>
        </Link>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-paper/92 px-4 backdrop-blur lg:hidden">
        <Link href="/" aria-label="Início">
          <Logo height={34} />
        </Link>
        <Link
          href="/perfil"
          className="flex min-h-10 items-center gap-1.5 rounded-full bg-night px-3.5 text-sm font-bold text-paper"
        >
          <span className="text-lime">Nv</span> {level.level}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pt-2 pb-28 lg:max-w-4xl lg:px-8 lg:pt-8 lg:pb-12">{children}</main>

      {/* Navegação inferior (celular) */}
      <nav
        aria-label="Principal"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/96 backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold',
                    active ? 'text-ink' : 'text-mute',
                  )}
                >
                  {active && <span className="absolute top-0 h-1 w-8 rounded-b-full bg-lime" aria-hidden />}
                  <item.icon size={22} strokeWidth={active ? 2.5 : 2} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/** Cabeçalho de página interna com botão de voltar. */
export function PageHeader({
  title,
  kicker,
  backHref,
  children,
}: {
  title: string;
  kicker?: string;
  backHref?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5">
      {backHref && (
        <Link href={backHref} className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-olive">
          <span aria-hidden>←</span> Voltar
        </Link>
      )}
      {kicker && <p className="text-xs font-bold tracking-[0.18em] text-brand-deep uppercase">{kicker}</p>}
      <h1 className="display text-[40px] text-ink">{title}</h1>
      {children && <div className="mt-1.5 text-[15px] leading-snug text-olive">{children}</div>}
    </div>
  );
}
