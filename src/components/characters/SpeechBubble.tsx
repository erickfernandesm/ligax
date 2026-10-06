'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

/** Texto que aparece aos poucos, como alguém falando. Tocar mostra tudo. */
export function useTypewriter(text: string, speedMs = 16) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!text) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setCount(text.length);
      return;
    }
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 2;
      });
    }, speedMs);
    return () => clearInterval(id);
  }, [text, speedMs]);
  const done = count >= text.length;
  return { shown: text.slice(0, count), done, finish: () => setCount(text.length) };
}

interface SpeechBubbleProps {
  children: ReactNode;
  /** Nome de quem fala, em cima do balão. */
  speaker?: string;
  accent?: string;
  tone?: 'light' | 'night';
  /** Lado da "pontinha" do balão. */
  tail?: 'left' | 'top' | 'none';
  className?: string;
  onClick?: () => void;
}

export function SpeechBubble({ children, speaker, accent, tone = 'light', tail = 'left', className, onClick }: SpeechBubbleProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-2xl px-4 py-3 text-[15px] leading-snug',
        tone === 'light' ? 'bg-card text-ink shadow-[0_1px_0_var(--color-line)]' : 'bg-white/10 text-paper',
        tail === 'left' && 'rounded-tl-md',
        className,
      )}
    >
      {tail === 'top' && (
        <span
          aria-hidden
          className={cn('absolute -top-1.5 left-6 h-3 w-3 rotate-45', tone === 'light' ? 'bg-card' : 'bg-[#33372a]')}
        />
      )}
      {speaker && (
        <div className="mb-0.5 text-[11px] font-bold tracking-wider uppercase" style={{ color: accent }}>
          {speaker}
        </div>
      )}
      {children}
    </div>
  );
}

/** Balão com efeito de digitação. */
export function TypedBubble({
  text,
  ...props
}: Omit<SpeechBubbleProps, 'children' | 'onClick'> & { text: string }) {
  const { shown, done, finish } = useTypewriter(text);
  return (
    <SpeechBubble {...props} onClick={done ? undefined : finish}>
      <span aria-live="polite">
        {/* o texto completo fica invisível por baixo para o balão não mudar de altura */}
        <span className="relative block">
          <span className="invisible" aria-hidden>
            {text}
          </span>
          <span className="absolute inset-0">{shown}</span>
        </span>
      </span>
    </SpeechBubble>
  );
}

export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-end gap-1', className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot h-1.5 w-1.5 rounded-full bg-current"
          style={{ animationDelay: `${i * 0.16}s` }}
        />
      ))}
    </span>
  );
}
