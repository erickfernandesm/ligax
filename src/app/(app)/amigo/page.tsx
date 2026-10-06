'use client';

import { ChevronRight, Trophy, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PlayerAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { EmptyState, SectionTitle, Stat } from '@/components/ui/primitives';
import { ONLINE_SCORE } from '@/content/progression';
import type { FriendMatch, RankingEntry } from '@/core/domain/types';
import { ColorPicker } from '@/features/game/OpponentPicker';
import { api, errorMessage } from '@/services/api';
import { useSessionStore } from '@/stores/session';

export default function AmigoPage() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const refresh = useSessionStore((s) => s.refresh);
  const [color, setColor] = useState<'w' | 'b' | 'r'>('r');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<FriendMatch[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    void refresh();
    void api<{ matches: FriendMatch[] }>('/api/matches').then((d) => setMatches(d.matches)).catch(() => {});
    void api<{ ranking: RankingEntry[] }>('/api/ranking').then((d) => setRanking(d.ranking)).catch(() => {});
  }, [refresh]);

  if (!user) return null;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const { match } = await api<{ match: FriendMatch }>('/api/matches', { body: { color } });
      router.push(`/amigo/${match.id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) return setError('O código tem 6 caracteres.');
    router.push(`/amigo/${clean}`);
  };

  const open = matches.filter((m) => m.status !== 'finished');

  return (
    <>
      <PageHeader kicker="Online" title="Jogar com um amigo" backHref="/jogar">
        Crie a partida, mande o código e jogue de qualquer lugar. Vitória online vale Score.
      </PageHeader>

      <section className="night-surface swoosh rounded-3xl p-5">
        <div className="relative z-10 grid grid-cols-3 gap-3">
          <Stat value={user.score} label="Seu Score" tone="night" />
          <Stat value={user.online.wins} label="Vitórias online" tone="night" />
          <Stat value={user.online.wins + user.online.losses + user.online.draws} label="Partidas online" tone="night" />
        </div>
        <p className="relative z-10 mt-3 text-xs text-paper/55">
          Vitória +{ONLINE_SCORE.win} · empate +{ONLINE_SCORE.draw} · derrota não tira pontos
        </p>
      </section>

      <SectionTitle className="mt-7">Criar partida</SectionTitle>
      <div className="rounded-3xl bg-card p-4">
        <p className="mb-2 text-sm font-bold text-ink">Você joga de</p>
        <ColorPicker value={color} onChange={setColor} />
        <Button size="lg" block className="mt-4" disabled={busy} icon={<UserPlus size={19} />} onClick={create}>
          Criar e convidar
        </Button>
      </div>

      <SectionTitle className="mt-7">Entrar com código</SectionTitle>
      <form onSubmit={join} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
            setError(null);
          }}
          aria-label="Código da partida"
          placeholder="CÓDIGO"
          autoCapitalize="characters"
          autoComplete="off"
          className="display min-h-14 min-w-0 flex-1 rounded-2xl border-2 border-line bg-card px-4 text-center text-3xl tracking-[0.2em] text-ink placeholder:text-mute/40 focus:border-brand focus:outline-none"
        />
        <Button type="submit" size="lg" variant="dark" disabled={code.length < 6}>
          Entrar
        </Button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-danger">
          {error}
        </p>
      )}

      {open.length > 0 && (
        <>
          <SectionTitle className="mt-7">Em andamento</SectionTitle>
          <ul className="overflow-hidden rounded-2xl bg-card">
            {open.map((m, i) => {
              const other = m.white?.id === user.id ? m.black : m.white;
              return (
                <li key={m.id} className={cn(i > 0 && 'border-t border-line')}>
                  <Link href={`/amigo/${m.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-paper">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">{other ? `Contra ${other.name}` : 'Aguardando amigo'}</span>
                      <span className="block text-sm text-mute">
                        Código {m.id} · {m.moves.length === 0 ? 'sem lances' : `${Math.ceil(m.moves.length / 2)} lances`}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-mute" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <SectionTitle className="mt-7">Ranking</SectionTitle>
      {ranking.length === 0 ? (
        <EmptyState icon={<Trophy size={30} />} title="Ninguém pontuou ainda" text="Vença uma partida online e seu nick aparece aqui." />
      ) : (
        <ol className="overflow-hidden rounded-2xl bg-card">
          {ranking.map((r, i) => (
            <li key={r.id} className={cn('flex items-center gap-3 px-4 py-3', i > 0 && 'border-t border-line', r.id === user.id && 'bg-lime/20')}>
              <span className="display w-7 text-2xl text-mute">{i + 1}</span>
              <PlayerAvatar name={r.name} color={r.avatarColor} size={36} />
              <span className="min-w-0 flex-1 truncate font-bold text-ink">{r.name}</span>
              <span className="text-right">
                <span className="display block text-2xl text-ink">{r.score}</span>
                <span className="block text-[11px] text-mute">{r.wins} vitórias</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
