import type { EngineLine } from './types';

export interface EvalSummary {
  /** Ex.: "+1.2", "-0.4", "M3". */
  label: string;
  /** Frase curta em português. */
  text: string;
  /** 0–1: quanto da barra pertence às brancas. */
  whiteShare: number;
}

/** Traduz a avaliação da engine para algo que um aluno entende. */
export function summarizeEval(line: EngineLine | undefined): EvalSummary | null {
  if (!line) return null;
  if (line.mateIn !== null) {
    const white = line.mateIn > 0;
    const n = Math.abs(line.mateIn);
    return {
      label: `${white ? '' : '-'}M${n}`,
      text: `${white ? 'Brancas' : 'Pretas'} dão mate em ${n}.`,
      whiteShare: white ? 1 : 0,
    };
  }
  const cp = line.scoreCp ?? 0;
  const pawns = cp / 100;
  const abs = Math.abs(pawns);
  const side = pawns > 0 ? 'Brancas' : 'Pretas';
  let text: string;
  if (abs < 0.3) text = 'Posição equilibrada.';
  else if (abs < 1) text = `${side} têm pequena vantagem.`;
  else if (abs < 2.5) text = `${side} estão melhores.`;
  else if (abs < 5) text = `${side} têm vantagem clara.`;
  else text = `${side} estão ganhando.`;
  return {
    label: `${abs < 0.05 ? '' : pawns > 0 ? '+' : '-'}${abs.toFixed(1)}`,
    text,
    whiteShare: 1 / (1 + Math.exp(-pawns / 2.2)),
  };
}
