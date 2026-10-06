'use client';

import { Check, ChevronRight, GraduationCap, KeyRound, LogOut, Pencil, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CharacterAvatar, PlayerAvatar } from '@/components/characters/CharacterAvatar';
import { AchievementIcon } from '@/components/progression/AchievementIcon';
import { XpBar } from '@/components/progression/XpBar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { EmptyState, Field, inputClass, SectionTitle, Stat } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { findBot } from '@/content/bots';
import { CHALLENGES } from '@/content/challenges';
import { findCharacter } from '@/content/characters';
import { TEACH_MODULES } from '@/content/teaching';
import type { GameRecord } from '@/core/domain/types';
import { achievementStatuses, winRate } from '@/core/progression';
import { clearLocalAccountData } from '@/hooks/useAccountSync';
import { errorMessage } from '@/services/api';
import { authService, AVATAR_COLORS } from '@/services/auth';
import { isStaff, useSessionStore } from '@/stores/session';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';

const OUTCOME = {
  win: { label: 'Vitória', cls: 'bg-brand text-white' },
  loss: { label: 'Derrota', cls: 'bg-danger/15 text-danger' },
  draw: { label: 'Empate', cls: 'bg-line text-olive' },
} as const;

const MODE = { treino: 'Treino', carreira: 'Carreira', laboratorio: 'Laboratório' } as const;

export default function PerfilPage() {
  const user = useSessionStore((s) => s.user);
  const updateProfile = useSessionStore((s) => s.updateProfile);
  const logout = useSessionStore((s) => s.logout);
  const progress = useProgressStore((s) => s.progress);
  const settings = useSettingsStore();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [color, setColor] = useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [pw, setPw] = useState<{ current: string; next: string; error: string | null; done: boolean } | null>(null);

  if (!user) return null;
  const { stats } = progress;
  const achievements = achievementStatuses(progress);
  const unlocked = achievements.filter((a) => a.unlockedAt).length;
  const challengesDone = Object.keys(progress.challengesSolved).length;
  const lessonsDone = Object.keys(progress.lessonsCompleted).length;
  const modulesDone = TEACH_MODULES.filter((m) => progress.teachCompleted[m.id]).length;
  const online = user.online;

  const saveProfile = async () => {
    try {
      await updateProfile({ name, avatarColor: color });
      setEditing(false);
    } catch (err) {
      setEditError(errorMessage(err));
    }
  };

  const exit = async () => {
    // o progresso já está salvo na conta; aqui só limpamos a cópia deste aparelho
    await logout();
    clearLocalAccountData();
  };

  return (
    <>
      <section className="night-surface swoosh mt-2 rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <PlayerAvatar name={user.name} color={user.avatarColor} size={68} />
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-[36px] text-paper">{user.name}</h1>
            <p className="truncate text-xs text-paper/55">{user.email}</p>
          </div>
          <button
            type="button"
            aria-label="Editar perfil"
            onClick={() => {
              setName(user.name);
              setColor(user.avatarColor);
              setEditError(null);
              setEditing(true);
            }}
            className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-paper"
          >
            <Pencil size={18} />
          </button>
        </div>
        <XpBar xp={progress.xp} tone="night" className="mt-5" />
        <p className="mt-2 text-xs text-paper/55">O nível sobe com desafios resolvidos, aulas assistidas e lições concluídas.</p>
      </section>

      <SectionTitle
        className="mt-7"
        action={
          <Link href="/amigo" className="flex min-h-11 items-center gap-1.5 text-sm font-bold text-brand-deep">
            <Users size={16} /> Jogar online
          </Link>
        }
      >
        Online
      </SectionTitle>
      <div className="grid grid-cols-3 gap-4 rounded-3xl bg-card p-5">
        <Stat value={user.score} label="Score" />
        <Stat value={online.wins} label="Vitórias" />
        <Stat value={online.wins + online.losses + online.draws} label="Partidas" />
      </div>

      <SectionTitle className="mt-7">Contra os tios</SectionTitle>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5 rounded-3xl bg-card p-5">
        <Stat value={stats.games} label="Partidas" />
        <Stat value={stats.wins} label="Vitórias" />
        <Stat value={stats.losses} label="Derrotas" />
        <Stat value={stats.draws} label="Empates" />
        <Stat value={`${winRate(progress)}%`} label="Taxa de vitória" />
        <Stat value={stats.currentStreak} label={`Sequência (recorde ${stats.bestStreak})`} />
      </div>

      <SectionTitle className="mt-7">Estudo</SectionTitle>
      <div className="grid grid-cols-3 gap-4 rounded-3xl bg-card p-5">
        <Stat value={`${challengesDone}`} label={`Desafios (de ${CHALLENGES.length})`} />
        <Stat value={lessonsDone} label="Aulas assistidas" />
        <Stat value={modulesDone} label={`Lições (de ${TEACH_MODULES.length})`} />
      </div>

      <SectionTitle
        className="mt-7"
        action={
          <span className="pb-1 text-sm font-bold text-mute tabular-nums">
            {unlocked}/{achievements.length}
          </span>
        }
      >
        Conquistas
      </SectionTitle>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {achievements.map(({ achievement: a, unlockedAt, current, target }) => (
          <li key={a.id} className={cn('flex items-center gap-3 rounded-2xl p-3', unlockedAt ? 'bg-card' : 'bg-card/50')}>
            <AchievementIcon name={a.icon} unlocked={!!unlockedAt} />
            <span className="min-w-0 flex-1">
              <span className={cn('block font-bold', unlockedAt ? 'text-ink' : 'text-olive')}>{a.title}</span>
              <span className="block text-sm leading-snug text-mute">{a.description}</span>
              {!unlockedAt && target > 1 && (
                <span className="mt-1.5 flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span className="block h-full rounded-full bg-moss" style={{ width: `${(current / target) * 100}%` }} />
                  </span>
                  <span className="text-[11px] font-bold text-mute tabular-nums">
                    {current}/{target}
                  </span>
                </span>
              )}
            </span>
            {unlockedAt && <Check size={18} strokeWidth={3} className="shrink-0 text-brand" />}
          </li>
        ))}
      </ul>

      <SectionTitle className="mt-7">Histórico recente</SectionTitle>
      {progress.history.length === 0 ? (
        <EmptyState title="Nenhuma partida ainda" text="Suas últimas partidas contra os tios aparecem aqui." />
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-card">
          {progress.history.slice(0, 8).map((g, i) => (
            <HistoryRow key={g.id} game={g} first={i === 0} />
          ))}
        </ul>
      )}

      <SectionTitle className="mt-7">Ajustes</SectionTitle>
      <div className="divide-y divide-line overflow-hidden rounded-2xl bg-card">
        <Toggle label="Sons" checked={settings.sound} onChange={(sound) => settings.set({ sound })} />
        <Toggle label="Coordenadas no tabuleiro" checked={settings.showCoords} onChange={(showCoords) => settings.set({ showCoords })} />
        {isStaff(user) && (
          <Link href="/admin" className="flex min-h-14 items-center gap-3 px-4">
            <GraduationCap size={20} className="text-brand-deep" />
            <span className="flex-1">
              <span className="block font-bold text-ink">{user.role === 'admin' ? 'Administração' : 'Painel do professor'}</span>
              <span className="block text-xs text-mute">
                {user.role === 'admin' ? 'Aulas, professores e permissões das contas' : 'Criar aulas e enviar vídeos'}
              </span>
            </span>
            <ChevronRight size={18} className="text-mute" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setPw({ current: '', next: '', error: null, done: false })}
          className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
        >
          <KeyRound size={20} className="text-brand-deep" />
          <span className="font-bold text-ink">Trocar senha</span>
        </button>
        <button type="button" onClick={() => setConfirmExit(true)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
          <LogOut size={20} className="text-danger" />
          <span className="font-bold text-danger">Sair da conta</span>
        </button>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Seu perfil">
        <div className="flex justify-center">
          <PlayerAvatar name={name || user.name} color={color} size={84} />
        </div>
        <div className="mt-4 space-y-4">
          <Field label="Nick" hint="De 3 a 20 caracteres. É como os outros jogadores te veem.">
            <input className={inputClass} value={name} maxLength={20} autoCapitalize="off" onChange={(e) => setName(e.target.value)} />
          </Field>
          <div>
            <p className="mb-2 text-sm font-bold text-ink">Cor do avatar</p>
            <div className="flex gap-2" role="radiogroup" aria-label="Cor do avatar">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={`Cor ${c}`}
                  onClick={() => setColor(c)}
                  className={cn('h-11 w-11 rounded-full', color === c && 'ring-4 ring-night/25')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          {editError && (
            <p role="alert" className="text-sm font-bold text-danger">
              {editError}
            </p>
          )}
          <Button block disabled={name.trim().length < 3} onClick={() => void saveProfile()}>
            Salvar
          </Button>
        </div>
      </Sheet>

      <Sheet open={!!pw} onClose={() => setPw(null)} title="Trocar senha">
        {pw?.done ? (
          <>
            <p className="text-[15px] text-olive">Senha alterada. Use a nova na próxima vez que entrar.</p>
            <Button block className="mt-5" onClick={() => setPw(null)}>
              Fechar
            </Button>
          </>
        ) : (
          pw && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await authService.changePassword(pw.current, pw.next);
                  setPw({ ...pw, done: true, error: null });
                } catch (err) {
                  setPw({ ...pw, error: errorMessage(err) });
                }
              }}
            >
              <Field label="Senha atual">
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="current-password"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value, error: null })}
                />
              </Field>
              <Field label="Nova senha" hint="Pelo menos 8 caracteres.">
                <input
                  className={inputClass}
                  type="password"
                  autoComplete="new-password"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value, error: null })}
                />
              </Field>
              {pw.error && (
                <p role="alert" className="text-sm font-bold text-danger">
                  {pw.error}
                </p>
              )}
              <Button type="submit" block disabled={!pw.current || pw.next.length < 8}>
                Salvar nova senha
              </Button>
            </form>
          )
        )}
      </Sheet>

      <Sheet open={confirmExit} onClose={() => setConfirmExit(false)} title="Sair da conta?">
        <p className="text-[15px] text-olive">
          Seu nível, Score, conquistas e posições ficam guardados na conta. É só entrar de novo com seu e-mail e senha.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmExit(false)}>
            Ficar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void exit()}>
            Sair
          </Button>
        </div>
      </Sheet>
    </>
  );
}

function HistoryRow({ game, first }: { game: GameRecord; first: boolean }) {
  const bot = findBot(game.botId);
  const character = findCharacter(bot?.characterId);
  const o = OUTCOME[game.outcome];
  return (
    <li className={cn('flex items-center gap-3 px-4 py-3', !first && 'border-t border-line')}>
      <CharacterAvatar characterId={character?.id} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-ink">{character?.name ?? 'Adversário'}</p>
        <p className="text-xs text-mute">
          {MODE[game.mode]} · {game.moveCount} lances ·{' '}
          {new Date(game.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </p>
      </div>
      <span className={cn('inline-block rounded-md px-2 py-0.5 text-xs font-bold', o.cls)}>{o.label}</span>
    </li>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
    >
      <span className="font-bold text-ink">{label}</span>
      <span className={cn('relative h-7 w-12 rounded-full transition-colors', checked ? 'bg-brand' : 'bg-line')}>
        <span className={cn('absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </span>
    </button>
  );
}
