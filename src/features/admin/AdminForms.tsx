'use client';

import { ImagePlus, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Field, inputClass } from '@/components/ui/primitives';
import { Sheet } from '@/components/ui/Sheet';
import { CATEGORY_LABEL, LEVEL_LABEL, SEED_POSITIONS } from '@/content/lessons';
import type { Lesson, LessonCategory, LessonLevel, LessonPractice, Professor, VideoSource } from '@/core/domain/types';
import { errorMessage } from '@/services/api';
import { AVATAR_COLORS } from '@/services/auth';
import { imageToThumbnail, mediaService, youtubeId } from '@/services/media';
import { useContentStore } from '@/stores/content';
import { useLabStore } from '@/stores/lab';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as LessonCategory[];
const LEVELS = Object.keys(LEVEL_LABEL) as LessonLevel[];

function ImageInput({
  value,
  onChange,
  label,
  maxWidth,
  round,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  label: string;
  maxWidth: number;
  round?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await imageToThumbnail(file, maxWidth));
      setError(null);
    } catch {
      setError('Não foi possível ler essa imagem.');
    }
  };
  return (
    <div>
      <p className="mb-1.5 text-sm font-bold text-ink">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={cn('h-16 object-cover', round ? 'w-16 rounded-full' : 'w-28 rounded-xl')} />
        ) : (
          <span className={cn('flex h-16 items-center justify-center bg-line text-mute', round ? 'w-16 rounded-full' : 'w-28 rounded-xl')}>
            <ImagePlus size={22} />
          </span>
        )}
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-card px-3 text-sm font-bold text-ink">
          <Upload size={16} />
          {value ? 'Trocar' : 'Enviar imagem'}
          <input type="file" accept="image/*" className="sr-only" onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {value && (
          <button
            type="button"
            aria-label="Remover imagem"
            onClick={() => onChange(undefined)}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-mute active:text-danger"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm font-bold text-danger">{error}</p>}
    </div>
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-card px-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[#81a44c]" />
      <span className="font-bold text-ink">{label}</span>
    </label>
  );
}

// ───────────────────────── Professor ─────────────────────────

export function ProfessorForm({
  professor,
  open,
  onClose,
}: {
  /** null = novo professor */
  professor: Professor | null;
  open: boolean;
  onClose: () => void;
}) {
  const saveProfessor = useContentStore((s) => s.saveProfessor);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<LessonCategory>('fundamentos');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [accent, setAccent] = useState(AVATAR_COLORS[0]);
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(professor?.name ?? '');
    setTitle(professor?.title ?? '');
    setArea(professor?.area ?? 'fundamentos');
    setBio(professor?.bio ?? '');
    setAvatar(professor?.avatar);
    setAccent(professor?.accent ?? AVATAR_COLORS[0]);
    setPublished(professor?.published ?? true);
    setError(null);
  }, [open, professor]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProfessor({
        id: professor?.id,
        characterId: professor?.characterId,
        name: name.trim(),
        title: title.trim() || `Professor de ${CATEGORY_LABEL[area]}`,
        area,
        bio: bio.trim(),
        avatar,
        accent: professor?.characterId ? professor.accent : accent,
        published,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={professor ? 'Editar professor' : 'Novo professor'}>
      <form className="space-y-4" onSubmit={submit}>
        {professor?.characterId ? (
          <div className="flex items-center gap-3 rounded-xl bg-card p-3">
            <CharacterAvatar characterId={professor.characterId} size={48} />
            <p className="text-sm text-olive">
              Personagem da casa. A imagem vem de <code className="text-xs">assets/characters/{professor.characterId}.png</code>.
            </p>
          </div>
        ) : (
          <ImageInput label="Foto ou caricatura" value={avatar} onChange={setAvatar} maxWidth={320} round />
        )}
        <Field label="Nome">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
        </Field>
        <Field label="Título" hint="Ex.: Professor de Fundamentos">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} />
        </Field>
        <Field label="Área">
          <select className={inputClass} value={area} onChange={(e) => setArea(e.target.value as LessonCategory)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Descrição">
          <textarea className={cn(inputClass, 'min-h-24 resize-none')} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} />
        </Field>
        {!professor?.characterId && (
          <div>
            <p className="mb-2 text-sm font-bold text-ink">Cor de destaque</p>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Cor ${c}`}
                  aria-pressed={accent === c}
                  onClick={() => setAccent(c)}
                  className={cn('h-10 w-10 rounded-full', accent === c && 'ring-4 ring-night/25')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}
        <CheckRow checked={published} onChange={setPublished} label="Visível para os alunos" />
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" block disabled={busy || name.trim().length < 2}>
          Salvar professor
        </Button>
      </form>
    </Sheet>
  );
}

// ───────────────────────── Aula ─────────────────────────

type VideoKind = 'youtube' | 'upload' | 'url';

export function LessonForm({
  lesson,
  open,
  onClose,
}: {
  /** null = nova aula */
  lesson: Lesson | null;
  open: boolean;
  onClose: () => void;
}) {
  const professors = useContentStore((s) => s.professors);
  const lessons = useContentStore((s) => s.lessons);
  const saveLesson = useContentStore((s) => s.saveLesson);
  const canUpload = useContentStore((s) => s.uploads);
  const userPositions = useLabStore((s) => s.positions);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [number, setNumber] = useState(1);
  const [category, setCategory] = useState<LessonCategory>('fundamentos');
  const [level, setLevel] = useState<LessonLevel>('iniciante');
  const [minutes, setMinutes] = useState(8);
  const [keyPoints, setKeyPoints] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [videoKind, setVideoKind] = useState<VideoKind>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [upload, setUpload] = useState<{ mediaId: string; name: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  /** 'keep' mantém a posição que a aula já tem; '' é nenhuma; o resto é o id de uma posição. */
  const [practiceChoice, setPracticeChoice] = useState('');
  const [published, setPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const firstProfessor = professors[0]?.id ?? '';
    setTitle(lesson?.title ?? '');
    setDescription(lesson?.description ?? '');
    setProfessorId(lesson?.professorId ?? firstProfessor);
    setCategory(lesson?.category ?? professors[0]?.area ?? 'fundamentos');
    setLevel(lesson?.level ?? 'iniciante');
    setMinutes(lesson?.minutes ?? 8);
    setKeyPoints(lesson?.keyPoints.join('\n') ?? '');
    setThumbnail(lesson?.thumbnail);
    setPracticeChoice(lesson?.practice ? 'keep' : '');
    setPublished(lesson?.published ?? false);
    setNumber(lesson?.number ?? lessons.filter((l) => l.professorId === firstProfessor).length + 1);
    const v = lesson?.video;
    setVideoKind(v ? v.kind : 'youtube');
    setVideoUrl(v && v.kind !== 'upload' ? v.url : '');
    setUpload(v && v.kind === 'upload' ? { mediaId: v.mediaId, name: v.name } : null);
    setUploadProgress(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lesson]);

  const pickVideo = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploadProgress(0);
    try {
      setUpload(await mediaService.upload(file, setUploadProgress));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploadProgress(null);
    }
  };

  /** Monta o vídeo a partir do formulário. null = ainda sem vídeo. */
  const buildVideo = (): VideoSource | null | { error: string } => {
    if (videoKind === 'upload') return upload ? { kind: 'upload', ...upload } : null;
    const url = videoUrl.trim();
    if (!url) return null;
    if (videoKind === 'youtube') {
      return youtubeId(url) ? { kind: 'youtube', url } : { error: 'Esse link do YouTube não parece válido.' };
    }
    return /^https?:\/\//.test(url) ? { kind: 'url', url } : { error: 'O link do vídeo precisa começar com http:// ou https://' };
  };

  const buildPractice = (): LessonPractice | null => {
    if (practiceChoice === 'keep') return lesson?.practice ?? null;
    const p = [...userPositions, ...SEED_POSITIONS].find((x) => x.id === practiceChoice);
    return p ? { name: p.name, description: p.description, fen: p.fen, annotations: p.annotations } : null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const video = buildVideo();
    if (video && 'error' in video) return setError(video.error);
    if (published && !video) return setError('Aula é vídeo: adicione o vídeo antes de publicar, ou salve como rascunho.');
    setBusy(true);
    setError(null);
    try {
      await saveLesson({
        id: lesson?.id,
        professorId,
        number,
        title: title.trim(),
        description: description.trim(),
        category,
        level,
        minutes,
        thumbnail,
        video,
        keyPoints: keyPoints
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        practice: buildPractice(),
        published,
      });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const uploading = uploadProgress !== null;

  return (
    <Sheet open={open} onClose={onClose} title={lesson ? 'Editar aula' : 'Nova aula'}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <p className="mb-1.5 text-sm font-bold text-ink">Vídeo da aula</p>
          <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-line p-1">
            {(
              [
                ['youtube', 'YouTube'],
                ['upload', 'Enviar arquivo'],
                ['url', 'Link direto'],
              ] as const
            )
              .filter(([value]) => value !== 'upload' || canUpload || videoKind === 'upload')
              .map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={videoKind === value}
                onClick={() => {
                  setVideoKind(value);
                  setError(null);
                }}
                className={cn('min-h-10 rounded-lg text-xs font-bold', videoKind === value ? 'bg-card text-ink' : 'text-olive')}
              >
                {label}
              </button>
            ))}
          </div>
          {videoKind !== 'upload' ? (
            <input
              className={cn(inputClass, 'mt-2')}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder={videoKind === 'youtube' ? 'https://www.youtube.com/watch?v=...' : 'https://.../aula.mp4'}
              aria-label="Link do vídeo"
              inputMode="url"
              autoCapitalize="off"
            />
          ) : (
            <div className="mt-2">
              <label
                className={cn(
                  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-line bg-card px-3 text-sm font-bold text-ink',
                  uploading && 'pointer-events-none opacity-60',
                )}
              >
                <Upload size={16} />
                {uploading ? `Enviando ${Math.round((uploadProgress ?? 0) * 100)}%` : upload ? 'Trocar arquivo' : 'Escolher vídeo'}
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(e) => void pickVideo(e.target.files?.[0])}
                />
              </label>
              {uploading && (
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round((uploadProgress ?? 0) * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-brand transition-[width]" style={{ width: `${(uploadProgress ?? 0) * 100}%` }} />
                </div>
              )}
              {upload && !uploading && <p className="mt-1.5 truncate text-sm text-olive">{upload.name}</p>}
              <p className="mt-1 text-xs text-mute">MP4, WebM ou MOV. O arquivo fica guardado no servidor da plataforma.</p>
            </div>
          )}
        </div>

        <Field label="Título">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={70} />
        </Field>
        <Field label="Descrição">
          <textarea
            className={cn(inputClass, 'min-h-20 resize-none')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={240}
          />
        </Field>
        <div className="grid grid-cols-[1fr_5.5rem] gap-3">
          <Field label="Professor">
            <select className={inputClass} value={professorId} onChange={(e) => setProfessorId(e.target.value)} required>
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Aula nº">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={number}
              onChange={(e) => setNumber(Math.max(1, Number(e.target.value) || 1))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as LessonCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dificuldade">
            <select className={inputClass} value={level} onChange={(e) => setLevel(e.target.value as LessonLevel)}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <ImageInput label="Thumbnail" value={thumbnail} onChange={setThumbnail} maxWidth={640} />

        <Field label="Duração (minutos)">
          <input
            type="number"
            min={1}
            className={inputClass}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))}
          />
        </Field>
        <Field label="Pontos principais" hint="Opcional. Um por linha; aparecem como resumo embaixo do vídeo.">
          <textarea className={cn(inputClass, 'min-h-24 resize-none')} value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} />
        </Field>
        <Field label="Posição para praticar" hint="Opcional. Aparece como “Agora pratique”. Monte posições no Laboratório.">
          <select className={inputClass} value={practiceChoice} onChange={(e) => setPracticeChoice(e.target.value)}>
            <option value="">Nenhuma</option>
            {lesson?.practice && <option value="keep">Manter: {lesson.practice.name}</option>}
            {userPositions.length > 0 && (
              <optgroup label="Minhas posições">
                {userPositions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Liga X">
              {SEED_POSITIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <CheckRow checked={published} onChange={setPublished} label="Publicada" />
        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" block disabled={busy || uploading || title.trim().length < 3 || !professorId}>
          {busy ? 'Salvando...' : 'Salvar aula'}
        </Button>
      </form>
    </Sheet>
  );
}
