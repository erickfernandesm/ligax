import type { Annotations, MarkColor } from '@/core/chess/types';

// Compartilhamento de posições por link. A posição inteira viaja dentro do
// próprio link, então qualquer pessoa abre sem precisar de conta. Para links
// curtos (ligax.com.br/posicao/abc123) basta guardar o conteúdo no servidor
// e trocar o código por um id — a tela /posicao continua igual.

export interface SharedPosition {
  name: string;
  description: string;
  fen: string;
  annotations: Annotations;
}

const COLORS: MarkColor[] = ['good', 'bad', 'warn', 'idea'];

// Formato compacto: cor (0–3) + casa. Marcações viram "0e41d5" e setas "0g1f3".
function packAnnotations(a: Annotations): [string, string] {
  return [
    a.squares.map((s) => `${COLORS.indexOf(s.color)}${s.square}`).join(''),
    a.arrows.map((s) => `${COLORS.indexOf(s.color)}${s.from}${s.to}`).join(''),
  ];
}

function unpackAnnotations(sq: string, ar: string): Annotations {
  const squares = (sq.match(/.{3}/g) ?? []).map((t) => ({ color: COLORS[Number(t[0])] ?? 'good', square: t.slice(1) }));
  const arrows = (ar.match(/.{5}/g) ?? []).map((t) => ({
    color: COLORS[Number(t[0])] ?? 'good',
    from: t.slice(1, 3),
    to: t.slice(3, 5),
  }));
  return { squares, arrows };
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): string {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeSharedPosition(p: SharedPosition): string {
  return toBase64Url(JSON.stringify({ n: p.name, d: p.description, f: p.fen, a: packAnnotations(p.annotations) }));
}

export function decodeSharedPosition(code: string): SharedPosition | null {
  try {
    const raw = JSON.parse(fromBase64Url(code));
    if (typeof raw?.f !== 'string') return null;
    return {
      name: String(raw.n ?? 'Posição'),
      description: String(raw.d ?? ''),
      fen: raw.f,
      annotations: unpackAnnotations(raw.a?.[0] ?? '', raw.a?.[1] ?? ''),
    };
  } catch {
    return null;
  }
}

export function sharedPositionPath(p: SharedPosition): string {
  return `/posicao?p=${encodeSharedPosition(p)}`;
}

/** Compartilha pelo menu nativo do celular; no desktop copia o link. */
export async function shareLink(url: string, title: string): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (typeof navigator !== 'undefined' && navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      await navigator.share({ url, title });
      return 'shared';
    }
  } catch {
    /* usuário cancelou: tenta copiar */
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}
