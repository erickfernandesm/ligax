'use client';

import { ChevronRight, FlaskConical, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/AppShell';
import { ContinueGameBanner } from '@/features/game/ContinueGameBanner';
import { OpponentPicker } from '@/features/game/OpponentPicker';

export default function JogarPage() {
  return (
    <>
      <PageHeader kicker="Treinar" title="Com quem você quer jogar?">
        Partida livre, sem pressão. Dá pra voltar lance.
      </PageHeader>

      <ContinueGameBanner className="mb-4" />

      <Link href="/amigo" className="night-surface swoosh mb-3 flex items-center gap-4 rounded-3xl p-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-lime text-night">
          <Users size={28} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="display block text-[26px] text-paper">Jogar com um amigo</span>
          <span className="block text-sm text-paper/70">Online, por código. Vitória vale Score.</span>
        </span>
        <ChevronRight size={20} className="relative z-10 text-paper/60" />
      </Link>

      <OpponentPicker mode="treino" />

      <div className="mt-6 divide-y divide-line border-y border-line">
        <Link href="/carreira" className="flex min-h-16 items-center gap-3 py-3">
          <Trophy size={22} className="text-brand-deep" />
          <span className="flex-1">
            <span className="block font-bold text-ink">Modo Carreira</span>
            <span className="block text-sm text-mute">Vença os tios, um de cada vez.</span>
          </span>
          <ChevronRight size={20} className="text-mute" />
        </Link>
        <Link href="/laboratorio" className="flex min-h-16 items-center gap-3 py-3">
          <FlaskConical size={22} className="text-brand-deep" />
          <span className="flex-1">
            <span className="block font-bold text-ink">Laboratório</span>
            <span className="block text-sm text-mute">Monte uma posição e jogue a partir dela.</span>
          </span>
          <ChevronRight size={20} className="text-mute" />
        </Link>
      </div>
    </>
  );
}
