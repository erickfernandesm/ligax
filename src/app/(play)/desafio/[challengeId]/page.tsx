import { Suspense } from 'react';
import { ChallengeLoader } from '@/features/challenges/ChallengeLoader';

export const metadata = { title: 'Desafio' };

export default function DesafioPage() {
  return (
    <Suspense fallback={null}>
      <ChallengeLoader />
    </Suspense>
  );
}
