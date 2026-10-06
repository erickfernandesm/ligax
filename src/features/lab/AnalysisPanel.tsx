'use client';

import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Cpu } from 'lucide-react';
import { MoveList } from '@/components/board/BoardExtras';
import { ThinkingDots } from '@/components/characters/SpeechBubble';
import { NightPanel } from '@/components/layout/PlayScreen';
import { IconButton } from '@/components/ui/Button';
import type { Color, MoveInput } from '@/core/chess/types';
import { STATUS_LABEL } from '@/core/chess/game';
import type { Analysis } from './useAnalysis';

/** Avaliação da posição: barra, número e uma frase que qualquer aluno entende. */
export function EvalSummary({ analysis, engineOn, onToggle }: { analysis: Analysis; engineOn: boolean; onToggle: () => void }) {
  const { evaluation, snapshot, thinking, depth, engineName } = analysis;
  const over = snapshot && snapshot.status !== 'playing';
  return (
    <NightPanel>
      <div className="flex items-center gap-3">
        <span className="display min-w-[58px] text-[30px] text-paper tabular-nums">
          {over || !engineOn ? '·' : (evaluation?.label ?? '…')}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-wider text-paper/50 uppercase">Avaliação da posição</p>
          <p className="truncate text-sm font-bold text-paper">
            {over
              ? STATUS_LABEL[snapshot!.status]
              : !engineOn
                ? 'Engine desligada.'
                : (evaluation?.text ?? (
                    <span className="inline-flex items-center gap-2 text-paper/70">
                      Analisando <ThinkingDots />
                    </span>
                  ))}
          </p>
        </div>
        <IconButton label={engineOn ? 'Desligar engine' : 'Ligar engine'} tone="night" active={engineOn} onClick={onToggle}>
          <Cpu size={20} />
        </IconButton>
      </div>
      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-black/60" aria-hidden>
        <div
          className="h-full bg-paper transition-[width] duration-500"
          style={{ width: `${(engineOn && !over && evaluation ? evaluation.whiteShare : 0.5) * 100}%` }}
        />
      </div>
      {engineOn && !over && (
        <p className="mt-1.5 text-[11px] text-paper/40">
          {engineName ?? 'Engine'} · profundidade {depth}
          {thinking ? ' · calculando' : ''}
        </p>
      )}
    </NightPanel>
  );
}

/** A melhor continuação segundo a engine — uma só. Tocar joga o primeiro lance. */
export function BestLine({ analysis, onPlay }: { analysis: Analysis; onPlay: (m: MoveInput) => void }) {
  const line = analysis.bestLine;
  if (!line || line.sans.length === 0) return null;
  return (
    <button
      type="button"
      disabled={!line.firstMove}
      onClick={() => line.firstMove && onPlay(line.firstMove)}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.07] px-3 py-2 text-left active:bg-white/15"
      aria-label={`Melhor lance: ${line.sans[0]}. Tocar para jogar.`}
    >
      <span className="shrink-0">
        <span className="block text-[11px] font-bold tracking-wider text-paper/50 uppercase">Melhor lance</span>
        <span className="display block text-2xl text-lime">{line.sans[0]}</span>
      </span>
      {line.sans.length > 1 && (
        <span className="line-clamp-2 min-w-0 flex-1 border-l border-white/15 pl-3 text-sm leading-snug text-paper/65">
          depois {line.sans.slice(1, 5).join(' ')}
        </span>
      )}
    </button>
  );
}

/** Voltar e avançar pelos lances jogados na análise. */
export function AnalysisNav({ analysis, firstColor }: { analysis: Analysis; firstColor: Color }) {
  const { cursor, line, goTo } = analysis;
  return (
    <NightPanel className="py-2">
      <div className="flex items-center gap-1">
        <IconButton label="Início" tone="night" disabled={cursor === 0} onClick={() => goTo(0)}>
          <ChevronFirst size={22} />
        </IconButton>
        <IconButton label="Voltar lance" tone="night" disabled={cursor === 0} onClick={() => goTo(cursor - 1)}>
          <ChevronLeft size={22} />
        </IconButton>
        <div className="min-w-0 flex-1 px-1">
          <MoveList
            moves={line}
            cursor={cursor}
            onSelect={goTo}
            firstColor={firstColor}
            layout="inline"
            emptyText="Jogue no tabuleiro."
          />
        </div>
        <IconButton label="Avançar lance" tone="night" disabled={cursor >= line.length} onClick={() => goTo(cursor + 1)}>
          <ChevronRight size={22} />
        </IconButton>
        <IconButton label="Fim" tone="night" disabled={cursor >= line.length} onClick={() => goTo(line.length)}>
          <ChevronLast size={22} />
        </IconButton>
      </div>
    </NightPanel>
  );
}
