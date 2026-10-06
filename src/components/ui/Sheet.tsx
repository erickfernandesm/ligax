'use client';

import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './cn';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** 'sheet' sobe de baixo no celular; 'center' é sempre um diálogo central. */
  variant?: 'sheet' | 'center';
  tone?: 'light' | 'night';
  /** Impede fechar tocando fora (momentos que pedem uma decisão). */
  dismissible?: boolean;
  className?: string;
}

/** Bottom sheet no celular, diálogo central em telas grandes. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  variant = 'sheet',
  tone = 'light',
  dismissible = true,
  className,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissible) onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, dismissible]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center',
        variant === 'sheet' ? 'items-end sm:items-center' : 'items-center p-4',
      )}
    >
      <div
        className="animate-fade absolute inset-0 bg-night/70 backdrop-blur-[2px]"
        onClick={dismissible ? onClose : undefined}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-sheet relative flex max-h-[90dvh] w-full flex-col overflow-hidden shadow-2xl',
          variant === 'sheet' ? 'rounded-t-3xl sm:max-w-md sm:rounded-3xl' : 'max-w-sm rounded-3xl',
          tone === 'light' ? 'bg-paper text-ink' : 'night-surface',
          className,
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
            <h2 className="display text-2xl">{title}</h2>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className={cn(
                  '-mr-2 flex h-11 w-11 items-center justify-center rounded-full',
                  tone === 'light' ? 'text-olive active:bg-black/10' : 'text-paper/70 active:bg-white/10',
                )}
              >
                <X size={22} />
              </button>
            )}
          </div>
        )}
        <div className="pb-safe overflow-y-auto overscroll-contain px-5 pt-2">
          <div className="pb-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
