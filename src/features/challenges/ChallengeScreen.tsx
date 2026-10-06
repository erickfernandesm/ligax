'use client';

import { Chess } from 'chess.js';
import { ArrowRight, Eye, Lightbulb, RotateCcw, Timer } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PromotionPicker } from '@/components/board/BoardExtras';
import { ChessBoard } from '@/components/board/ChessBoard';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { TypedBubble } from '@/components/characters/SpeechBubble';
import { PlayScreen } from '@/components/layout/PlayScreen';
import { CountUp } from '@/components/progression/XpBar';
import { Button, LinkButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { CHALLENGE_TYPE_LABEL } from '@/content/challenges';
import { HAROLDO_ID } from '@/content/characters';
import { challengePlayerColor, challengePlayerMoves, evaluateAttempt } from '@/core/challenges';
import type { Annotations, MoveInput } from '@/core/chess/types';
import type { Challenge, Reward } from '@/core/domain/types';
import { useBoardInput } from '@/hooks/useBoardInput';
import { useChessGame } from '@/hooks/useChessGame';
import { useSound } from '@/hooks/useSound';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';

type Phase = 'solving' | 'wrong' | 'solved' | 'timeout' | 'revealing' | 'revealed';

interface Props {
  challenge: Challenge;
  isDaily: boolean;
  /** Próximo desafio da lista, se houver. */
  nextHref: string | null;
}

/** Modo Desafio: uma posição, um objetivo, e o Haroldo de olho. */
export function ChallengeScreen({ challenge, isDaily, nextHref }: Props) {
  const playerColor = challengePlayerColor(challenge);
  const totalMoves = challengePlayerMoves(challenge);
  const game = useChessGame(challenge.fen);
  const solveChallenge = useProgressStore((s) => s.solveChallenge);
  const alreadySolved = useProgressStore((s) => !!s.progress.challengesSolved[challenge.id]);
  const showCoords = useSettingsStore((s) => s.showCoords);
  const { play, playMove } = useSound();

  const [phase, setPhase] = useState<Phase>('solving');
  const [played, setPlayed] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [hint, setHint] = useState(false);
  const [usedReveal, setUsedReveal] = useState(false);
  const [shake, setShake] = useState(0);
  const [reward, setReward] = useState<Reward | null>(null);
  const [timeLeft, setTimeLeft] = useState(challenge.timeLimitSec ?? 0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  // ── relógio (desafios por tempo) ──
  const timed = !!challenge.timeLimitSec;
  const ticking = timed && (phase === 'solving' || phase === 'wrong');
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [ticking]);
  useEffect(() => {
    if (ticking && timeLeft === 0) {
      play('lose');
      setPhase('timeout');
    }
  }, [ticking, timeLeft, play]);

  const reset = useCallback(() => {
    clearTimers();
    game.load(challenge.fen);
    setPlayed([]);
    setPhase('solving');
    setTimeLeft(challenge.timeLimitSec ?? 0);
  }, [game, challenge]);

  const onMove = useCallback(
    (input: MoveInput) => {
      const result = evaluateAttempt(challenge, game.fen(), played, input);
      if (!result.san) return;
      if (!result.correct) {
        setAttempts((n) => n + 1);
        setShake((n) => n + 1);
        play('error');
        setPhase('wrong');
        return;
      }
      const record = game.move(input);
      if (record) playMove(record);
      if (result.solved) {
        // só vale XP se resolveu sem pedir a solução
        const r = usedReveal ? null : solveChallenge(challenge, isDaily);
        setReward(r);
        play('win');
        setPhase('solved');
        return;
      }
      setPhase('solving');
      const line = [...played, result.san];
      if (result.reply) {
        const reply = result.reply;
        setPlayed([...line, reply]);
        timers.current.push(
          setTimeout(() => {
            const r = game.move(reply);
            if (r) playMove(r);
          }, 650),
        );
      } else {
        setPlayed(line);
      }
    },
    [challenge, game, played, play, playMove, solveChallenge, isDaily, usedReveal],
  );

  /** Mostra a solução no tabuleiro, lance a lance. */
  const reveal = () => {
    clearTimers();
    setUsedReveal(true);
    game.load(challenge.fen);
    setPlayed([]);
    setPhase('revealing');
    challenge.solution.forEach((san, i) => {
      timers.current.push(
        setTimeout(() => {
          const r = game.move(san);
          if (r) playMove(r);
          if (i === challenge.solution.length - 1) setPhase('revealed');
        }, 900 * (i + 1)),
      );
    });
  };

  const canMove = (phase === 'solving' || phase === 'wrong') && game.snapshot.turn === playerColor;
  const input = useBoardInput({
    board: game.snapshot.board,
    movable: canMove ? playerColor : null,
    getTargets: game.legalTargets,
    needsPromotion: game.needsPromotion,
    onMove,
  });

  // Dica visual: destaca a peça que resolve.
  const annotations = useMemo<Annotations>(() => {
    if (!hint || played.length > 0 || phase === 'solved' || phase === 'revealing' || phase === 'revealed') {
      return { squares: [], arrows: [] };
    }
    try {
      const m = new Chess(challenge.fen).move(challenge.solution[0]);
      return { squares: [{ square: m.from, color: 'warn' }], arrows: [] };
    } catch {
      return { squares: [], arrows: [] };
    }
  }, [hint, played.length, phase, challenge]);

  const bubble =
    phase === 'solved'
      ? challenge.successText
      : phase === 'wrong'
        ? challenge.failText
        : phase === 'timeout'
          ? 'Acabou o tempo. Respira e tenta de novo.'
          : phase === 'revealing'
            ? 'Olha com atenção.'
            : phase === 'revealed'
              ? 'Essa era a ideia. Agora faz você, sem ajuda.'
              : hint
                ? challenge.hint
                : challenge.prompt;

  const movesDone = Math.ceil(played.length / 2);
  const xpNow = reward?.xpGained ?? 0;

  return (
    <PlayScreen
      title={challenge.title}
      kicker={isDaily ? 'Desafio do dia' : CHALLENGE_TYPE_LABEL[challenge.type]}
      backHref="/desafios"
      chrome={300}
      actions={
        timed ? (
          <span
            className={cn(
              'mr-2 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums',
              timeLeft <= 5 && ticking ? 'bg-danger text-white' : 'bg-white/10 text-paper',
            )}
            role="timer"
          >
            <Timer size={16} /> {timeLeft}s
          </span>
        ) : undefined
      }
    >
      <div className="flex items-start gap-3">
        <CharacterAvatar characterId={HAROLDO_ID} size={52} />
        <TypedBubble
          key={`${phase}-${hint}-${attempts}`}
          text={bubble}
          tone="night"
          speaker={challenge.source === 'professor' ? `Desafio de ${challenge.authorName ?? 'professor'}` : 'Haroldo'}
          accent="var(--color-lime)"
          className="min-h-[72px] flex-1"
        />
      </div>

      <div className="play-board">
        <ChessBoard
          board={game.snapshot.board}
          orientation={playerColor}
          lastMove={game.snapshot.lastMove}
          checkSquare={game.snapshot.checkSquare}
          annotations={annotations}
          showCoords={showCoords}
          shakeKey={shake}
          {...input.boardProps}
        />
      </div>

      {phase === 'solved' ? (
        <div className="animate-rise rounded-2xl bg-lime/15 p-4 text-center ring-1 ring-lime/40">
          <p className="display text-4xl text-lime">
            {xpNow > 0 ? (
              <>
                +<CountUp value={xpNow} /> XP
              </>
            ) : (
              'Resolvido'
            )}
          </p>
          <p className="mt-1 text-sm text-paper/70">
            {usedReveal
              ? 'Você viu a solução antes, então esse não valeu XP.'
              : xpNow === 0
                ? 'Você já tinha resolvido esse.'
                : attempts === 0
                  ? 'De primeira.'
                  : `Resolvido depois de ${attempts} ${attempts === 1 ? 'erro' : 'erros'}.`}
          </p>
          <div className="mt-4 flex gap-2">
            {nextHref ? (
              <LinkButton href={nextHref} variant="lime" className="flex-1" icon={<ArrowRight size={18} />}>
                Próximo desafio
              </LinkButton>
            ) : (
              <LinkButton href="/desafios" variant="lime" className="flex-1">
                Ver todos os desafios
              </LinkButton>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold text-paper/80">
              {playerColor === 'w' ? 'Brancas jogam' : 'Pretas jogam'}
              {totalMoves > 1 && (
                <span className="ml-2 font-medium text-paper/50">
                  lance {Math.min(movesDone + 1, totalMoves)} de {totalMoves}
                </span>
              )}
            </span>
            <span className="font-bold text-lime">{alreadySolved ? 'Já resolvido' : `Vale ${challenge.xp} XP`}</span>
          </div>
          <div className="flex gap-2">
            {phase === 'timeout' || phase === 'revealed' ? (
              <Button variant="lime" className="flex-1" icon={<RotateCcw size={18} />} onClick={reset}>
                Tentar de novo
              </Button>
            ) : (
              <>
                <Button
                  variant="dark"
                  size="sm"
                  className="flex-1 bg-white/10"
                  icon={<Lightbulb size={17} />}
                  disabled={hint || phase === 'revealing'}
                  onClick={() => setHint(true)}
                >
                  Dica
                </Button>
                {played.length > 0 && (
                  <Button variant="dark" size="sm" className="flex-1 bg-white/10" icon={<RotateCcw size={17} />} onClick={reset}>
                    Recomeçar
                  </Button>
                )}
                {attempts >= 2 && (
                  <Button
                    variant="dark"
                    size="sm"
                    className="flex-1 bg-white/10"
                    icon={<Eye size={17} />}
                    disabled={phase === 'revealing'}
                    onClick={reveal}
                  >
                    Ver solução
                  </Button>
                )}
              </>
            )}
          </div>
        </>
      )}

      <PromotionPicker
        color={input.promotion?.color ?? null}
        onChoose={input.choosePromotion}
        onCancel={input.cancelPromotion}
      />
    </PlayScreen>
  );
}
