'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

interface PlayScreenProps {
  title: string;
  kicker?: string;
  /** Para onde o "voltar" leva. */
  backHref: string;
  /** Intercepta o voltar (ex.: confirmar abandono de partida). Retorne false para cancelar. */
  onBack?: () => boolean | void;
  actions?: ReactNode;
  /**
   * Altura reservada, em px, para tudo que divide a tela com o tabuleiro no
   * modo retrato. O tabuleiro encolhe para caber, mas nunca abaixo de 300px
   * nem acima da largura da tela.
   */
  chrome?: number;
  children: ReactNode;
}

/**
 * Casca das telas de tabuleiro (partida, ensino, desafio, laboratório).
 * Sem navegação inferior: foco total no jogo. Os filhos são empilhados no
 * retrato; em paisagem/desktop o filho com a classe `play-board` vai para a
 * esquerda e o resto vira um painel à direita.
 */
export function PlayScreen({ title, kicker, backHref, onBack, actions, chrome = 300, children }: PlayScreenProps) {
  const router = useRouter();
  const back = () => {
    if (onBack && onBack() === false) return;
    router.push(backHref);
  };
  return (
    <div className="night-surface flex min-h-dvh flex-col">
      <header className="mx-auto flex h-14 w-full max-w-5xl shrink-0 items-center gap-1 px-2">
        <button
          type="button"
          onClick={back}
          aria-label="Voltar"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-paper/80 active:bg-white/10"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0 flex-1">
          {kicker && <p className="truncate text-[10px] font-bold tracking-[0.18em] text-lime uppercase">{kicker}</p>}
          <h1 className="display truncate text-[22px] text-paper">{title}</h1>
        </div>
        {actions}
      </header>
      <main
        className="pb-safe flex-1 px-3"
        style={{ '--chrome': `${chrome}px`, '--chrome-wide': '84px' } as CSSProperties}
      >
        <div className="play-grid pb-4">{children}</div>
      </main>
    </div>
  );
}

/** Painel translúcido usado dentro das telas escuras. */
export function NightPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl bg-white/[0.07] p-3', className)}>{children}</div>;
}
