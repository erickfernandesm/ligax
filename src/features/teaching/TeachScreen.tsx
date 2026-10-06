'use client';

import { Chess } from 'chess.js';
import { ArrowRight, Lightbulb, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PromotionPicker } from '@/components/board/BoardExtras';
import { ChessBoard } from '@/components/board/ChessBoard';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { TypedBubble } from '@/components/characters/SpeechBubble';
import { PlayScreen } from '@/components/layout/PlayScreen';
import { RewardSummary } from '@/components/progression/XpBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { findCharacter } from '@/content/characters';
import { TEACH_MODULES } from '@/content/teaching';
import type { Annotations, MoveInput } from '@/core/chess/types';
import type { Reward, TeachModule } from '@/core/domain/types';
import { useBoardInput } from '@/hooks/useBoardInput';
import { useChessGame } from '@/hooks/useChessGame';
import { useSound } from '@/hooks/useSound';
import { useContentStore } from '@/stores/content';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';

type Phase = 'idle' | 'demo' | 'success' | 'wrong';

const WRONG_OPENERS = ['Ainda não.', 'Não é esse.', 'Quase.', 'Calma.'];

/** Modo Ensino: o professor conduz o aluno passo a passo no tabuleiro. */
export function TeachScreen({ module }: { module: TeachModule }) {
  const professor = useContentStore((s) => s.professors.find((p) => p.id === module.professorId));
  const character = findCharacter(professor?.characterId ?? module.professorId);
  const showCoords = useSettingsStore((s) => s.showCoords);
  const completeTeachModule = useProgressStore((s) => s.completeTeachModule);
  const { play, playMove } = useSound();

  const game = useChessGame(module.steps[0].fen);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(module.steps[0].kind === 'demo' ? 'demo' : 'idle');
  const [wrongCount, setWrongCount] = useState(0);
  const [shake, setShake] = useState(0);
  const [finished, setFinished] = useState<{ reward: Reward; xpAfter: number } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Resposta do adversário ainda não jogada (o aluno pode tocar em Continuar antes). */
  const pendingReply = useRef<string | null>(null);

  const step = module.steps[index];
  const isLast = index === module.steps.length - 1;

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** Entra num passo: troca a posição se precisar e roda a demonstração. */
  const enter = useCallback(
    (i: number) => {
      clearTimers();
      pendingReply.current = null;
      const next = module.steps[i];
      if (next.fen) game.load(next.fen);
      setIndex(i);
      setWrongCount(0);
      if (next.kind === 'demo') {
        setPhase('demo');
        next.moves.forEach((san, k) => {
          timers.current.push(
            setTimeout(() => {
              const record = game.move(san);
              if (record) playMove(record);
              if (k === next.moves.length - 1) setPhase('idle');
            }, 900 * (k + 1)),
          );
        });
      } else {
        setPhase('idle');
      }
    },
    [module.steps, game, playMove],
  );

  const advance = () => {
    if (pendingReply.current) {
      game.move(pendingReply.current);
      pendingReply.current = null;
    }
    if (isLast) {
      const reward = completeTeachModule(module);
      play('win');
      setFinished({ reward, xpAfter: useProgressStore.getState().progress.xp });
    } else {
      enter(index + 1);
    }
  };

  const onMove = useCallback(
    (input: MoveInput) => {
      if (step.kind !== 'play') return;
      const record = game.move(input);
      if (!record) return;
      if (step.expect.includes(record.san)) {
        playMove(record);
        setPhase('success');
        if (step.reply) {
          pendingReply.current = step.reply;
          timers.current.push(
            setTimeout(() => {
              if (!pendingReply.current) return;
              const r = game.move(pendingReply.current);
              pendingReply.current = null;
              if (r) playMove(r);
            }, 800),
          );
        }
      } else {
        // lance legal, mas não é o da lição: a peça volta
        timers.current.push(
          setTimeout(() => {
            game.undo(1);
            setShake((n) => n + 1);
            play('error');
            setWrongCount((n) => n + 1);
            setPhase('wrong');
          }, 260),
        );
      }
    },
    [step, game, play, playMove],
  );

  const waitingMove = step.kind === 'play' && (phase === 'idle' || phase === 'wrong');
  const input = useBoardInput({
    board: game.snapshot.board,
    movable: waitingMove ? game.snapshot.turn : null,
    getTargets: game.legalTargets,
    needsPromotion: game.needsPromotion,
    onMove,
  });

  // Marcações do passo + seta de dica depois de um erro.
  const annotations = useMemo<Annotations>(() => {
    if (phase === 'success') return { squares: [], arrows: [] };
    const base: Annotations = { squares: step.squares ?? [], arrows: [...(step.arrows ?? [])] };
    if (step.kind === 'play' && phase === 'wrong') {
      try {
        const m = new Chess(game.snapshot.fen).move(step.expect[0]);
        base.arrows.push({ from: m.from, to: m.to, color: 'good' });
      } catch {
        /* sem dica visual */
      }
    }
    return base;
  }, [step, phase, game.snapshot.fen]);

  const bubble =
    step.kind === 'play' && phase === 'success'
      ? step.successText
      : step.kind === 'play' && phase === 'wrong'
        ? `${WRONG_OPENERS[(wrongCount - 1) % WRONG_OPENERS.length]} ${step.hint}`
        : step.text;

  const nextModule = useMemo(() => {
    const i = TEACH_MODULES.findIndex((m) => m.id === module.id);
    return TEACH_MODULES[i + 1];
  }, [module.id]);

  if (finished) {
    return (
      <PlayScreen title={module.title} kicker="Lição concluída" backHref="/aprender">
        <div className="flex flex-col items-center pt-6 text-center">
          <CharacterAvatar characterId={character?.id} name={professor?.name} size={96} className="animate-pop" />
          <h2 className="display mt-5 text-5xl text-lime">Lição concluída</h2>
          <p className="mt-2 max-w-xs text-[15px] text-paper/80">
            {finished.reward.xpGained > 0
              ? `Você aprendeu: ${module.concept.toLowerCase()}.`
              : 'Revisão feita. O XP dessa lição você já tinha ganhado.'}
          </p>
          <div className="mt-5 w-full max-w-sm">
            <RewardSummary reward={finished.reward} xpAfter={finished.xpAfter} />
          </div>
          <div className="mt-7 flex w-full max-w-sm flex-col gap-2">
            {nextModule && (
              <Link
                href={`/ensino/${nextModule.id}`}
                className="flex min-h-16 items-center gap-3 rounded-2xl bg-lime px-4 py-3 text-left text-night shadow-[0_3px_0_#8fa600] active:translate-y-[3px] active:shadow-none"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold tracking-wider uppercase opacity-70">Próxima lição</span>
                  <span className="block font-bold">{nextModule.title}</span>
                </span>
                <ArrowRight size={20} className="shrink-0" />
              </Link>
            )}
            <LinkButton href="/jogar" variant="dark" block className="bg-white/10">
              Colocar em prática numa partida
            </LinkButton>
            <LinkButton href="/aprender" variant="ghost" block className="text-paper/70">
              Voltar para Aprender
            </LinkButton>
          </div>
        </div>
      </PlayScreen>
    );
  }

  return (
    <PlayScreen title={module.title} kicker={professor?.name ?? 'Modo Ensino'} backHref="/aprender" chrome={290}>
      {/* progresso da lição */}
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={module.steps.length}
        aria-valuenow={index + 1}
        aria-label="Progresso da lição"
      >
        {module.steps.map((_, i) => (
          <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= index ? 'bg-lime' : 'bg-white/15')} />
        ))}
      </div>

      <div className="play-board">
        <ChessBoard
          board={game.snapshot.board}
          lastMove={game.snapshot.lastMove}
          checkSquare={game.snapshot.checkSquare}
          annotations={annotations}
          showCoords={showCoords}
          shakeKey={shake}
          {...input.boardProps}
        />
      </div>

      {/* o professor */}
      <div className="flex items-start gap-3">
        <CharacterAvatar characterId={character?.id} name={professor?.name} size={52} />
        <TypedBubble
          key={`${index}-${phase === 'demo' ? 'idle' : phase}-${wrongCount}`}
          text={bubble}
          tone="night"
          speaker={professor?.name ?? character?.name}
          accent={character?.accent}
          className="min-h-[76px] flex-1"
        />
      </div>

      <div className="flex gap-2">
        {index > 0 && (
          <Button
            variant="dark"
            className="bg-white/10"
            aria-label="Recomeçar a lição"
            onClick={() => enter(0)}
            icon={<RotateCcw size={18} />}
          />
        )}
        {waitingMove ? (
          <div className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 px-3 text-sm font-bold text-paper/75">
            <Lightbulb size={17} className="text-lime" />
            Sua vez: faça o lance no tabuleiro
          </div>
        ) : (
          <Button variant="lime" className="flex-1" disabled={phase === 'demo'} onClick={advance} icon={<ArrowRight size={18} />}>
            {isLast ? 'Concluir lição' : 'Continuar'}
          </Button>
        )}
      </div>

      <PromotionPicker
        color={input.promotion?.color ?? null}
        onChoose={input.choosePromotion}
        onCancel={input.cancelPromotion}
      />
    </PlayScreen>
  );
}
