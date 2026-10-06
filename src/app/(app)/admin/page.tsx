'use client';

import { Eye, EyeOff, Pencil, Plus, Search, ShieldCheck, Trash2, Video, VideoOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { CharacterAvatar, PlayerAvatar } from '@/components/characters/CharacterAvatar';
import { PageHeader } from '@/components/layout/AppShell';
import { Button, LinkButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { EmptyState, inputClass, Tag } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { CATEGORY_LABEL, LEVEL_LABEL } from '@/content/lessons';
import type { Lesson, Professor, User, UserRole } from '@/core/domain/types';
import { LessonForm, ProfessorForm } from '@/features/admin/AdminForms';
import { api, errorMessage } from '@/services/api';
import { useContentStore } from '@/stores/content';
import { isStaff, useSessionStore } from '@/stores/session';

type Tab = 'lessons' | 'professors' | 'users';

const ROLE_LABEL: Record<UserRole, string> = { aluno: 'Aluno', professor: 'Professor', admin: 'Admin' };
const ROLE_HINT: Record<UserRole, string> = {
  aluno: 'Joga, estuda e assiste às aulas.',
  professor: 'Também cria aulas e envia vídeos.',
  admin: 'Também gerencia contas e professores.',
};

/**
 * Painel de quem cuida do conteúdo.
 *  - Professores (contas com essa permissão): criam aulas e enviam vídeos.
 *  - Admins: além disso, cadastram os perfis de professor e decidem quais
 *    contas têm permissão de professor.
 */
export default function AdminPage() {
  const user = useSessionStore((s) => s.user);
  const { professors, lessons, removeLesson, removeProfessor, saveLesson } = useContentStore();
  const isAdmin = user?.role === 'admin';
  const [tab, setTab] = useState<Tab>('lessons');
  const [lessonForm, setLessonForm] = useState<{ lesson: Lesson | null } | null>(null);
  const [professorForm, setProfessorForm] = useState<{ professor: Professor | null } | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: 'lessons' | 'professors'; id: string; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  if (!isStaff(user)) {
    return (
      <>
        <PageHeader kicker="Painel" title="Área restrita" backHref="/perfil" />
        <EmptyState
          icon={<ShieldCheck size={32} />}
          title="Sua conta não tem acesso ao painel"
          text="O painel é para professores da Liga X. Se você é professor, peça a um administrador para liberar a sua conta."
          action={
            <LinkButton href="/" variant="outline">
              Voltar ao início
            </LinkButton>
          }
        />
      </>
    );
  }

  const sorted = [...lessons].sort((a, b) => a.professorId.localeCompare(b.professorId) || a.number - b.number);
  const tabs: [Tab, string][] = [
    ['lessons', `Aulas (${lessons.length})`],
    ...(isAdmin ? ([['professors', 'Professores'], ['users', 'Contas']] as [Tab, string][]) : []),
  ];

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      if (toDelete.kind === 'lessons') await removeLesson(toDelete.id);
      else await removeProfessor(toDelete.id);
    } catch (err) {
      setNotice(errorMessage(err));
    }
    setToDelete(null);
  };

  const togglePublished = async (l: Lesson) => {
    try {
      await saveLesson({ ...l, published: !l.published });
    } catch (err) {
      setNotice(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader kicker={isAdmin ? 'Administração' : 'Painel do professor'} title="Conteúdo" backHref="/perfil">
        {isAdmin ? 'Aulas, professores e permissões das contas.' : 'Crie suas aulas e envie os vídeos.'}
      </PageHeader>

      {tabs.length > 1 && (
        <div className="grid gap-1 rounded-2xl bg-line p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={tab === value}
              onClick={() => setTab(value)}
              className={cn('min-h-11 rounded-xl text-sm font-bold', tab === value ? 'bg-card text-ink' : 'text-olive')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {notice && (
        <p role="alert" className="mt-3 rounded-xl bg-danger/10 px-3.5 py-3 text-sm font-bold text-danger">
          {notice}
        </p>
      )}

      {tab === 'lessons' && (
        <>
          <Button block className="mt-4" icon={<Plus size={18} />} disabled={professors.length === 0} onClick={() => setLessonForm({ lesson: null })}>
            Nova aula
          </Button>
          {sorted.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="Nenhuma aula cadastrada" text="Crie a primeira aula, envie o vídeo e publique." />
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {sorted.map((l) => {
                const professor = professors.find((p) => p.id === l.professorId);
                return (
                  <li key={l.id} className="rounded-2xl bg-card p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Tag color={l.published ? '#55722b' : undefined}>{l.published ? 'Publicada' : 'Rascunho'}</Tag>
                      <Tag>{CATEGORY_LABEL[l.category]}</Tag>
                      <Tag>{LEVEL_LABEL[l.level]}</Tag>
                      {l.video ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-brand-deep">
                          <Video size={13} /> com vídeo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-bold text-danger">
                          <VideoOff size={13} /> falta o vídeo
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-bold text-ink">
                      Aula {String(l.number).padStart(2, '0')}: {l.title}
                    </p>
                    <p className="text-sm text-mute">{professor?.name ?? 'Sem professor'}</p>
                    <Button variant="outline" size="sm" block className="mt-2" icon={<Pencil size={15} />} onClick={() => setLessonForm({ lesson: l })}>
                      {l.video ? 'Editar aula' : 'Adicionar vídeo'}
                    </Button>
                    <div className="mt-2 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!l.video && !l.published}
                        icon={l.published ? <EyeOff size={15} /> : <Eye size={15} />}
                        onClick={() => void togglePublished(l)}
                      >
                        {l.published ? 'Despublicar' : 'Publicar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        aria-label={`Excluir aula ${l.title}`}
                        icon={<Trash2 size={15} />}
                        onClick={() => setToDelete({ kind: 'lessons', id: l.id, name: l.title })}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {tab === 'professors' && isAdmin && (
        <>
          <Button block className="mt-4" icon={<Plus size={18} />} onClick={() => setProfessorForm({ professor: null })}>
            Novo professor
          </Button>
          <ul className="mt-4 space-y-2">
            {professors.map((p) => {
              const count = lessons.filter((l) => l.professorId === p.id).length;
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-card p-3">
                  <CharacterAvatar characterId={p.characterId} src={p.avatar} name={p.name} accent={p.accent} size={52} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">
                      {p.name} {!p.published && <span className="text-xs font-bold text-mute">(oculto)</span>}
                    </p>
                    <p className="truncate text-sm text-mute">
                      {p.title} · {count} {count === 1 ? 'aula' : 'aulas'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Editar ${p.name}`}
                    onClick={() => setProfessorForm({ professor: p })}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-olive active:bg-paper"
                  >
                    <Pencil size={18} />
                  </button>
                  {!p.characterId && (
                    <button
                      type="button"
                      aria-label={`Excluir ${p.name}`}
                      onClick={() => setToDelete({ kind: 'professors', id: p.id, name: p.name })}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-mute active:text-danger"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {tab === 'users' && isAdmin && <UsersTab currentUserId={user!.id} />}

      <LessonForm open={!!lessonForm} lesson={lessonForm?.lesson ?? null} onClose={() => setLessonForm(null)} />
      <ProfessorForm open={!!professorForm} professor={professorForm?.professor ?? null} onClose={() => setProfessorForm(null)} />

      <Sheet open={!!toDelete} onClose={() => setToDelete(null)} title="Excluir?">
        <p className="text-[15px] text-olive">
          “{toDelete?.name}” será excluído{toDelete?.kind === 'professors' ? ', junto com as aulas desse professor' : ''}. Não dá pra
          desfazer.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setToDelete(null)}>
            Cancelar
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => void confirmDelete()}>
            Excluir
          </Button>
        </div>
      </Sheet>
    </>
  );
}

/** Contas da plataforma e a permissão de cada uma. */
function UsersTab({ currentUserId }: { currentUserId: string }) {
  const refresh = useSessionStore((s) => s.refresh);
  const [users, setUsers] = useState<User[] | null>(null);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ users: User[] }>('/api/admin/users')
      .then((d) => setUsers(d.users))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users ?? []).filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q));
  }, [users, query]);

  const setRole = async (role: UserRole) => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const { user } = await api<{ user: User }>(`/api/admin/users/${editing.id}`, { method: 'PATCH', body: { role } });
      setUsers((list) => (list ?? []).map((u) => (u.id === user.id ? user : u)));
      setEditing(null);
      if (user.id === currentUserId) void refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <p className="mt-4 text-sm text-olive">
        Escolha quais contas são de professor. Só elas conseguem criar aulas e enviar vídeos.
      </p>
      <label className="relative mt-3 block">
        <Search size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-mute" />
        <input
          className={cn(inputClass, 'pl-10')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nick ou e-mail"
          aria-label="Buscar conta"
        />
      </label>
      {error && !editing && (
        <p role="alert" className="mt-3 text-sm font-bold text-danger">
          {error}
        </p>
      )}
      {users === null && !error ? (
        <p className="mt-6 text-center text-sm text-mute">Carregando contas...</p>
      ) : filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nenhuma conta encontrada" />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {filtered.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setEditing(u);
                }}
                aria-label={`Permissão de ${u.name}`}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left active:bg-paper"
              >
                <PlayerAvatar name={u.name} color={u.avatarColor} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold break-words text-ink">
                    {u.name} {u.id === currentUserId && <span className="text-xs text-mute">(você)</span>}
                  </span>
                  <span className="block text-sm break-all text-mute">{u.email}</span>
                </span>
                <Tag color={u.role === 'admin' ? '#5a4b8c' : u.role === 'professor' ? '#55722b' : undefined}>{ROLE_LABEL[u.role]}</Tag>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? `Permissão de ${editing.name}` : ''}>
        <p className="text-sm break-all text-mute">{editing?.email}</p>
        <div className="mt-3 space-y-2" role="radiogroup" aria-label="Permissão">
          {(['aluno', 'professor', 'admin'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              role="radio"
              aria-checked={editing?.role === role}
              disabled={busy}
              onClick={() => void setRole(role)}
              className={cn(
                'flex min-h-16 w-full flex-col justify-center rounded-2xl border-2 px-4 py-2 text-left',
                editing?.role === role ? 'border-brand bg-brand/10' : 'border-line bg-card',
              )}
            >
              <span className="font-bold text-ink">{ROLE_LABEL[role]}</span>
              <span className="text-sm text-mute">{ROLE_HINT[role]}</span>
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm font-bold text-danger">
            {error}
          </p>
        )}
      </Sheet>
    </>
  );
}
