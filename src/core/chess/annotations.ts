import type { Annotations, MarkColor, Square } from './types';

// Operações puras sobre marcações (casas destacadas e setas).

/** Toque numa casa: marca, troca de cor ou desmarca. */
export function toggleSquareMark(a: Annotations, square: Square, color: MarkColor): Annotations {
  const existing = a.squares.find((s) => s.square === square);
  const squares = a.squares.filter((s) => s.square !== square);
  if (!existing || existing.color !== color) squares.push({ square, color });
  return { ...a, squares };
}

/** Traço de uma casa a outra: desenha, troca de cor ou apaga a seta. */
export function toggleArrowMark(a: Annotations, from: Square, to: Square, color: MarkColor): Annotations {
  const existing = a.arrows.find((s) => s.from === from && s.to === to);
  const arrows = a.arrows.filter((s) => !(s.from === from && s.to === to));
  if (!existing || existing.color !== color) arrows.push({ from, to, color });
  return { ...a, arrows };
}

export function applyStroke(a: Annotations, from: Square, to: Square, color: MarkColor): Annotations {
  return from === to ? toggleSquareMark(a, from, color) : toggleArrowMark(a, from, to, color);
}

export function hasAnnotations(a: Annotations): boolean {
  return a.squares.length > 0 || a.arrows.length > 0;
}

export const MARK_LABEL: Record<MarkColor, string> = {
  good: 'Boa jogada',
  bad: 'Erro ou perigo',
  warn: 'Atenção',
  idea: 'Ideia ou plano',
};
