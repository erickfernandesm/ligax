import { Suspense } from 'react';
import { LabScreen } from '@/features/lab/LabScreen';

export const metadata = { title: 'Laboratório' };

export default function LaboratorioPage() {
  return (
    <Suspense fallback={null}>
      <LabScreen />
    </Suspense>
  );
}
