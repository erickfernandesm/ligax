'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { findTeachModule } from '@/content/teaching';
import { TeachScreen } from '@/features/teaching/TeachScreen';

export default function EnsinoPage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const router = useRouter();
  const teachModule = findTeachModule(moduleId);

  useEffect(() => {
    if (!teachModule) router.replace('/aprender');
  }, [teachModule, router]);

  if (!teachModule) return null;
  return <TeachScreen key={teachModule.id} module={teachModule} />;
}
