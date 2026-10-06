'use client';

import { FlaskConical } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Logo } from '@/components/layout/Logo';
import { LinkButton } from '@/components/ui/Button';
import { fenToBoard, fenTurn } from '@/core/chess/fen';
import { decodeSharedPosition } from '@/services/share';

/** Tela pública de um link compartilhado: qualquer pessoa vê a mesma posição. */
export function SharedPositionView() {
  const params = useSearchParams();
  const code = params.get('p') ?? '';
  const shared = useMemo(() => decodeSharedPosition(code), [code]);
  const board = useMemo(() => (shared ? fenToBoard(shared.fen) : null), [shared]);

  return (
    <main className="night-surface flex min-h-dvh flex-col items-center px-4 pt-5 pb-8">
      <Logo height={38} onDark />
      {!shared || !board ? (
        <div className="mt-16 max-w-xs text-center">
          <h1 className="display text-4xl text-paper">Link inválido</h1>
          <p className="mt-2 text-paper/70">Esse link de posição está incompleto ou foi alterado.</p>
          <LinkButton href="/" variant="lime" className="mt-6">
            Ir para a Liga X
          </LinkButton>
        </div>
      ) : (
        <div className="mt-5 w-full max-w-md">
          <p className="text-[11px] font-bold tracking-[0.18em] text-lime uppercase">Posição compartilhada</p>
          <h1 className="display text-[34px] text-paper">{shared.name}</h1>
          {shared.description && <p className="mt-1 text-[15px] text-paper/75">{shared.description}</p>}
          <div className="mt-4">
            <ChessBoard board={board} orientation={fenTurn(shared.fen)} annotations={shared.annotations} />
          </div>
          <p className="mt-3 text-sm font-bold text-paper/70">
            {fenTurn(shared.fen) === 'w' ? 'Brancas jogam.' : 'Pretas jogam.'}
          </p>
          <LinkButton href={`/laboratorio?p=${code}`} variant="lime" size="lg" block className="mt-4" icon={<FlaskConical size={18} />}>
            Abrir no Laboratório
          </LinkButton>
        </div>
      )}
    </main>
  );
}
