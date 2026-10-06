'use client';

import { ArrowRight, Eye, EyeOff, GraduationCap, Swords, Target, Users } from 'lucide-react';
import { useState } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { SpeechBubble } from '@/components/characters/SpeechBubble';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { HAROLDO_ID } from '@/content/characters';
import { errorMessage } from '@/services/api';
import { useSessionStore } from '@/stores/session';

type Mode = 'login' | 'register';

const HIGHLIGHTS = [
  { icon: Swords, text: 'Jogue contra os tios da casa' },
  { icon: Users, text: 'Desafie um amigo online' },
  { icon: GraduationCap, text: 'Aulas em vídeo e lições guiadas' },
  { icon: Target, text: 'Desafios para subir de nível' },
];

const field =
  'min-h-[52px] w-full rounded-2xl border-2 border-line bg-card px-4 text-base text-ink placeholder:text-mute/60 focus:border-brand focus:outline-none';

/**
 * Entrada da plataforma: entrar com e-mail e senha ou criar a conta (e-mail,
 * senha e nick).
 * Celular: a marca em cima e o formulário embaixo, rolando normalmente.
 * Desktop: duas colunas presas à altura da janela — a página nunca rola.
 */
export function AuthScreen() {
  const login = useSessionStore((s) => s.login);
  const register = useSessionStore((s) => s.register);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === 'register';

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    // confere no aparelho o que dá para conferir; o servidor valida tudo de novo
    if (isRegister && nick.trim().length < 3) return setError('Escolha um nick com pelo menos 3 caracteres.');
    if (isRegister && password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setBusy(true);
    setError(null);
    try {
      if (isRegister) await register({ email, password, nick });
      else await login({ email, password });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="min-h-dvh lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:overflow-hidden">
      {/* Marca */}
      <section className="night-surface swoosh px-5 pt-6 pb-8 lg:flex lg:h-dvh lg:flex-col lg:justify-center lg:overflow-hidden lg:px-14 lg:py-6">
        <div className="relative z-10 mx-auto w-full max-w-md lg:max-w-lg">
          <Logo height={40} onDark />
          <p className="display mt-6 text-lg text-lime lg:mt-[4dvh]">Xadrez da Liga X</p>
          <h1 className="display mt-1 text-[clamp(34px,11vw,46px)] leading-[0.92] text-paper lg:text-[clamp(44px,9.5dvh,84px)]">
            Jogar. Aprender. Evoluir.
          </h1>
          <div className="mt-5 flex items-start gap-3 lg:mt-[3.5dvh]">
            <CharacterAvatar characterId={HAROLDO_ID} size={52} />
            <SpeechBubble tone="night" speaker="Haroldo" accent="var(--color-lime)" className="min-w-0 flex-1">
              {isRegister
                ? 'Bem-vindo à Liga X. Escolhe um nick: é assim que vão te conhecer por aqui.'
                : 'Voltou? Então entra. O tabuleiro tá esperando.'}
            </SpeechBubble>
          </div>
          {/* só em desktop com altura sobrando */}
          <ul className="mt-8 hidden grid-cols-2 gap-3 [@media(min-width:1024px)_and_(min-height:760px)]:grid">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-center gap-3 text-[15px] text-paper/80">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lime">
                  <h.icon size={20} />
                </span>
                {h.text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Formulário */}
      <section className="auth-form -mt-4 rounded-t-3xl bg-paper px-5 pt-6 pb-10 lg:mt-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto lg:rounded-none lg:px-12 lg:py-5">
        <div className="mx-auto w-full max-w-md lg:my-auto">
          <div role="tablist" aria-label="Acesso" className="grid grid-cols-2 gap-1 rounded-2xl bg-line p-1">
            {(
              [
                ['login', 'Entrar'],
                ['register', 'Criar conta'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => switchMode(value)}
                className={cn('min-h-12 rounded-xl text-[15px] font-bold', mode === value ? 'bg-night text-lime' : 'text-olive')}
              >
                {label}
              </button>
            ))}
          </div>

          <h2 className="display mt-6 text-[34px] text-ink">{isRegister ? 'Crie sua conta' : 'Entre na sua conta'}</h2>
          <p className="auth-optional mt-1 text-[15px] text-olive">
            {isRegister
              ? 'Leva um minuto. Seu progresso fica salvo e você pode jogar com amigos.'
              : 'Seu nível, seu Score e suas partidas estão guardados.'}
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            {isRegister && (
              <label className="block">
                <span className="mb-1.5 block text-sm font-bold text-ink">Nick</span>
                <input
                  className={field}
                  value={nick}
                  onChange={(e) => setNick(e.target.value)}
                  maxLength={20}
                  autoComplete="nickname"
                  autoCapitalize="off"
                  placeholder="Como você quer aparecer"
                  required
                />
                <span className="auth-optional mt-1 block text-xs text-mute">
                  De 3 a 20 caracteres. É o nome que seus adversários veem.
                </span>
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-ink">E-mail</span>
              <input
                className={field}
                type="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="off"
                placeholder="voce@email.com"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-ink">Senha</span>
              <span className="relative block">
                <input
                  className={cn(field, 'pr-14')}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'Pelo menos 8 caracteres' : 'Sua senha'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                  className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-mute"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-danger/10 px-3.5 py-3 text-sm font-bold text-danger">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" block disabled={busy || !email || !password} icon={<ArrowRight size={20} />}>
              {busy ? 'Só um instante...' : isRegister ? 'Criar conta e entrar' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-3 text-center text-[15px] text-olive">
            {isRegister ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="min-h-11 px-1 font-bold text-brand-deep underline underline-offset-2"
            >
              {isRegister ? 'Entrar' : 'Criar conta'}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
