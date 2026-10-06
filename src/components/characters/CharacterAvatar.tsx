import manifest from '@/config/assets.generated.json';
import { findCharacter } from '@/content/characters';
import { cn } from '@/components/ui/cn';

const GENERATED: Record<string, string> = manifest.characters;

/**
 * Resolve a imagem de um personagem:
 * 1. `avatar` definido no cadastro; 2. arquivo em /assets/characters/<id>.*;
 * 3. nada → silhueta preta.
 */
export function resolveAvatar(characterId?: string, explicit?: string): string | null {
  if (explicit) return explicit;
  if (!characterId) return null;
  return findCharacter(characterId)?.avatar ?? GENERATED[characterId] ?? null;
}

/** Silhueta preta usada enquanto a caricatura oficial não chega. */
function Silhouette() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <rect width="64" height="64" fill="#d6d8c9" />
      <circle cx="32" cy="25" r="12.5" fill="#0d0e0a" />
      <path d="M8 66c0-15 10.5-25 24-25s24 10 24 25z" fill="#0d0e0a" />
    </svg>
  );
}

interface CharacterAvatarProps {
  /** id do personagem (bots, professores da casa, Haroldo). */
  characterId?: string;
  /** Para professores cadastrados pelo painel, sem personagem. */
  src?: string;
  name?: string;
  accent?: string;
  size?: number;
  /** Anel na cor do personagem. */
  ring?: boolean;
  shape?: 'circle' | 'rounded';
  className?: string;
}

/**
 * Único ponto onde um personagem vira imagem. Trocar a silhueta pela
 * caricatura oficial não exige mexer em nenhuma tela.
 */
export function CharacterAvatar({
  characterId,
  src,
  name,
  accent,
  size = 56,
  ring = true,
  shape = 'circle',
  className,
}: CharacterAvatarProps) {
  const character = findCharacter(characterId);
  const image = resolveAvatar(characterId, src);
  const color = accent ?? character?.accent ?? '#595c4e';
  const label = name ?? character?.name ?? 'Personagem';
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'relative inline-block shrink-0 overflow-hidden bg-[#d6d8c9]',
        shape === 'circle' ? 'rounded-full' : 'rounded-2xl',
        className,
      )}
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 ${Math.max(2, Math.round(size / 22))}px ${color}` : undefined,
      }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <Silhouette />
      )}
    </span>
  );
}

/** Avatar do jogador: inicial do nome sobre a cor escolhida. */
export function PlayerAvatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="display inline-flex shrink-0 items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.52 }}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  );
}
