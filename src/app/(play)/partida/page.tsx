import { Suspense } from 'react';
import { MatchLoader } from '@/features/game/MatchLoader';

export const metadata = { title: 'Partida' };

export default function PartidaPage() {
  return (
    <Suspense fallback={null}>
      <MatchLoader />
    </Suspense>
  );
}
