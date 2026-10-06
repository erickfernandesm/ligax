import { Suspense } from 'react';
import { SharedPositionView } from '@/features/lab/SharedPositionView';

export const metadata = { title: 'Posição compartilhada' };

export default function PosicaoPage() {
  return (
    <Suspense fallback={null}>
      <SharedPositionView />
    </Suspense>
  );
}
