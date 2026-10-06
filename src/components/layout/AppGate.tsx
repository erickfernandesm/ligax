'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { CelebrationHost } from '@/components/progression/CelebrationHost';
import { AuthScreen } from '@/features/onboarding/AuthScreen';
import { useAccountSync } from '@/hooks/useAccountSync';
import { useHydrated } from '@/hooks/useHydrated';
import { warmUpEngine } from '@/services/engine';
import { useContentStore } from '@/stores/content';
import { useSessionStore } from '@/stores/session';
import { Logo } from './Logo';

/** Rotas que funcionam sem conta (links de posição compartilhada). */
const PUBLIC_PATHS = ['/posicao'];

function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <Logo height={56} className="animate-glow" />
    </div>
  );
}

/**
 * Porta de entrada do app: descobre se há sessão, mostra o login/cadastro,
 * carrega os dados da conta e hospeda as celebrações globais.
 */
export function AppGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const user = useSessionStore((s) => s.user);
  const status = useSessionStore((s) => s.status);
  const init = useSessionStore((s) => s.init);
  const loadContent = useContentStore((s) => s.load);
  const synced = useAccountSync(user?.id ?? null);

  useEffect(() => {
    void init();
  }, [init]);

  // conteúdo depende de quem está logado (professor vê rascunhos)
  useEffect(() => {
    if (status !== 'ready') return;
    void loadContent();
    if (user) warmUpEngine();
  }, [status, user?.id, user?.role, loadContent]); // eslint-disable-line react-hooks/exhaustive-deps

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!hydrated || status === 'loading') return <Splash />;
  if (!user) return isPublic ? <>{children}</> : <AuthScreen />;
  if (!synced) return <Splash />;

  return (
    <>
      {children}
      <CelebrationHost />
    </>
  );
}
