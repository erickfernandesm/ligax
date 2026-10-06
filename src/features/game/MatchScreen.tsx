'use client';

import { Flag, History, RefreshCw, RotateCcw, Undo2, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CapturedRow, MoveList, PromotionPicker } from '@/components/board/BoardExtras';
import { ChessBoard } from '@/components/board/ChessBoard';
import { CharacterAvatar, PlayerAvatar } from '@/components/characters/CharacterAvatar';
import { ThinkingDots } from '@/components/characters/SpeechBubble';
import { NightPanel, PlayScreen } from '@/components/layout/PlayScreen';
import { RewardSummary } from '@/components/progression/XpBar';
import { Button, IconButton, LinkButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Sheet } from '@/components/ui/Sheet';
import { getCharacter, HAROLDO_ID } from '@/content/characters';
import { CAREER_STAGES } from '@/content/progression';
import { getBot } from '@/content/bots';
import { STATUS_LABEL } from '@/core/chess/game';
import { materialInfo } from '@/core/chess/material';
import { useBoardInput } from '@/hooks/useBoardInput';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useMatch, type MatchConfig, type MatchResult } from './useMatch';

const MODE_LABEL = { treino: 'Treino', carreira: 'Carreira', laboratorio: 'Posição personalizada' } as const;

export function MatchScreen({ config }: { config: MatchConfig }) {
  const router = useRouter();
  const match = useMatch(config);
  const { snapshot, playing, playerTurn, thinking } = match;
  const { bot, mode, playerColor } = config;
  const character = getCharacter(bot.characterId);
  const user = useSessionStore((s) => s.user);
  const sound = useSettingsStore((s) => s.sound);
  const showCoords = useSettingsStore((s) => s.showCoords);
  const setSettings = useSettingsStore((s) => s.set);

  const [flipped, setFlipped] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | 'resign' | 'restart' | 'leave'>(null);

  const input = useBoardInput({
    board: snapshot.board,
    movable: playerTurn ? playerColor : null,
    getTargets: match.game.legalTargets,
    needsPromotion: match.game.needsPromotion,
    onMove: match.playerMove,
  });

  const material = materialInfo(snapshot.board);
  const botAdvantage = (match.botColor === 'w' ? 1 : -1) * material.balance;
  const orientation = flipped ? match.botColor : playerColor;
  const inProgress = playing && snapshot.moves.length > 0;
  const firstColor = snapshot.startFen.split(' ')[1] === 'b' ? 'b' : 'w';

  let status: { text: string; tone: 'lime' | 'idle' | 'danger' };
  if (!playing) {
    const text =
      snapshot.winner === null ? 'Empate' : snapshot.winner === playerColor ? 'Você venceu' : `${character.name} venceu`;
    status = { text, tone: 'idle' };
  } else if (playerTurn) {
    status = snapshot.inCheck ? { text: 'Xeque! Sua vez', tone: 'danger' } : { text: 'Sua vez', tone: 'lime' };
  } else {
    status = { text: 'Vez do adversário', tone: 'idle' };
  }

  const leave = () => {
    if (inProgress && mode === 'carreira') {
      setConfirm('leave');
      return false;
    }
  };

  const doConfirm = () => {
    const action = confirm;
    setConfirm(null);
    if (action === 'resign') match.resign();
    if (action === 'restart') match.restart();
    if (action === 'leave') {
      match.resign();
      router.push('/carreira');
    }
  };

  const askRestart = () => {
    // na carreira, reiniciar no meio conta como desistência (senão ninguém perderia nunca)
    if (inProgress && mode === 'carreira') setConfirm('restart');
    else match.restart();
  };

  return (
    <PlayScreen
      title={character.name}
      kicker={MODE_LABEL[mode]}
      backHref={mode === 'carreira' ? '/carreira' : mode === 'laboratorio' ? '/laboratorio' : '/jogar'}
      onBack={leave}
      chrome={330}
      actions={
        <>
          <IconButton label={sound ? 'Desligar som' : 'Ligar som'} tone="night" onClick={() => setSettings({ sound: !sound })}>
            {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </IconButton>
          <IconButton label="Girar tabuleiro" tone="night" active={flipped} onClick={() => setFlipped((f) => !f)}>
            <RefreshCw size={20} />
          </IconButton>
        </>
      }
    >
      {/* 1. adversário */}
      <div className="flex items-center gap-3">
        <CharacterAvatar characterId={character.id} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-bold text-paper">
              {character.name}
              <span className="ml-2 text-xs font-medium text-paper/55">
                Nível {bot.level} · {bot.difficultyLabel}
              </span>
            </p>
            {mode !== 'laboratorio' && (
              <CapturedRow pieces={material.lost[playerColor]} pieceColor={playerColor} advantage={botAdvantage} />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 min-h-[20px] text-sm leading-tight text-paper/75" aria-live="polite">
            {thinking ? (
              <span className="inline-flex items-center gap-2 text-lime">
                {character.name} está pensando
                <ThinkingDots />
              </span>
            ) : (
              match.speech && <>“{match.speech}”</>
            )}
          </p>
        </div>
      </div>

      {/* 2. tabuleiro */}
      <div className="play-board">
        <ChessBoard
          board={snapshot.board}
          orientation={orientation}
          lastMove={snapshot.lastMove}
          checkSquare={snapshot.checkSquare}
          showCoords={showCoords}
          shakeKey={match.shake}
          {...input.boardProps}
        />
      </div>

      {/* 3. estado da partida */}
      <div className="flex items-center gap-3">
        {user && <PlayerAvatar name={user.name} color={user.avatarColor} size={40} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-paper">{user?.name ?? 'Você'}</p>
          {mode !== 'laboratorio' && (
            <CapturedRow pieces={material.lost[match.botColor]} pieceColor={match.botColor} advantage={-botAdvantage} />
          )}
        </div>
        <span
          role="status"
          className={cn(
            'rounded-full px-3.5 py-2 text-sm font-bold whitespace-nowrap',
            status.tone === 'lime' && 'bg-lime text-night',
            status.tone === 'danger' && 'bg-danger text-white',
            status.tone === 'idle' && 'bg-white/10 text-paper/80',
          )}
        >
          {status.text}
        </span>
      </div>

      {/* 4. controles */}
      <div className="flex gap-2">
        {playing ? (
          <>
            <ControlButton icon={<Flag size={19} />} label="Desistir" onClick={() => setConfirm('resign')} />
            {mode !== 'carreira' && (
              <ControlButton icon={<Undo2 size={19} />} label="Voltar lance" disabled={!match.canUndo} onClick={match.undo} />
            )}
            <ControlButton icon={<RotateCcw size={19} />} label="Reiniciar" onClick={askRestart} />
          </>
        ) : (
          <>
            <Button variant="lime" size="sm" className="flex-1" icon={<RotateCcw size={17} />} onClick={match.restart}>
              Novo jogo
            </Button>
            <LinkButton
              href={mode === 'carreira' ? '/carreira' : mode === 'laboratorio' ? '/laboratorio' : '/jogar'}
              variant="dark"
              size="sm"
              className="flex-1 bg-white/10"
            >
              {mode === 'carreira' ? 'Carreira' : mode === 'laboratorio' ? 'Laboratório' : 'Adversários'}
            </LinkButton>
          </>
        )}
      </div>

      {/* 5. histórico: uma linha no celular (abre completo), painel no desktop */}
      <button
        type="button"
        onClick={() => setHistoryOpen(true)}
        className="wide:hidden flex min-h-11 items-center gap-2 rounded-2xl bg-white/[0.07] px-3 text-left"
        aria-label="Abrir histórico de lances"
      >
        <History size={17} className="shrink-0 text-paper/60" />
        <MoveList moves={snapshot.moves} firstColor={firstColor} layout="inline" className="min-w-0 flex-1" />
      </button>
      <NightPanel className="wide:block hidden">
        <p className="mb-2 text-[11px] font-bold tracking-wider text-paper/50 uppercase">Lances</p>
        <div className="max-h-[38dvh] overflow-y-auto">
          <MoveList moves={snapshot.moves} firstColor={firstColor} />
        </div>
      </NightPanel>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Lances" tone="night">
        <MoveList moves={snapshot.moves} firstColor={firstColor} />
      </Sheet>

      <PromotionPicker
        color={input.promotion?.color ?? null}
        onChoose={input.choosePromotion}
        onCancel={input.cancelPromotion}
      />

      <Sheet
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'resign' ? 'Desistir da partida?' : confirm === 'restart' ? 'Reiniciar?' : 'Sair da partida?'}
      >
        <p className="text-[15px] text-olive">
          {confirm === 'resign'
            ? mode === 'laboratorio'
              ? 'A partida termina aqui.'
              : 'Vai contar como derrota.'
            : 'Na carreira, abandonar uma partida em andamento conta como derrota.'}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="outline" block onClick={() => setConfirm(null)}>
            Continuar jogando
          </Button>
          <Button variant="danger" block onClick={doConfirm}>
            {confirm === 'resign' ? 'Desistir' : confirm === 'restart' ? 'Reiniciar' : 'Sair'}
          </Button>
        </div>
      </Sheet>

      {match.result && (
        <ResultSheet
          result={match.result}
          config={config}
          reason={STATUS_LABEL[snapshot.status]}
          speech={match.speech}
          onClose={match.closeResult}
          onRematch={match.restart}
        />
      )}
    </PlayScreen>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl bg-white/10 text-paper active:bg-white/20 disabled:opacity-40"
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

const OUTCOME_TITLE = { win: 'Vitória!', loss: 'Derrota', draw: 'Empate' } as const;

function ResultSheet({
  result,
  config,
  reason,
  speech,
  onClose,
  onRematch,
}: {
  result: MatchResult;
  config: MatchConfig;
  reason: string;
  speech: string | null;
  onClose: () => void;
  onRematch: () => void;
}) {
  const { outcome, reward } = result;
  const character = getCharacter(config.bot.characterId);
  const cleared = CAREER_STAGES.find((s) => s.id === reward.careerStageCleared);
  const nextStage = cleared ? CAREER_STAGES[CAREER_STAGES.indexOf(cleared) + 1] : undefined;

  return (
    <Sheet open onClose={onClose} tone="night" variant="center">
      <div className="relative flex flex-col items-center text-center">
        {outcome === 'win' && (
          <div className="rays pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2" aria-hidden />
        )}
        <h2
          className={cn(
            'display animate-pop relative text-[64px]',
            outcome === 'win' ? 'text-lime' : outcome === 'loss' ? 'text-paper/85' : 'text-paper',
          )}
        >
          {OUTCOME_TITLE[outcome]}
        </h2>
        <p className="relative -mt-1 text-sm text-paper/60">{reason}</p>

        {speech && (
          <div className="relative mt-4 flex w-full items-center gap-3 rounded-2xl bg-white/[0.08] p-3 text-left">
            <CharacterAvatar characterId={character.id} size={44} />
            <p className="text-sm leading-snug text-paper/90">
              <span className="block text-[11px] font-bold tracking-wider uppercase" style={{ color: character.accent }}>
                {character.name}
              </span>
              “{speech}”
            </p>
          </div>
        )}

        <div className="relative mt-4 w-full">
          {config.mode === 'laboratorio' ? (
            <p className="text-sm text-paper/60">Partida a partir de posição montada: não conta para a carreira.</p>
          ) : (
            <RewardSummary reward={reward} xpAfter={result.xpAfter} levelBar={false} />
          )}
        </div>

        {cleared && (
          <div className="animate-rise relative mt-3 flex w-full items-center gap-3 rounded-2xl bg-lime/15 p-3 text-left ring-1 ring-lime/40">
            <CharacterAvatar characterId={HAROLDO_ID} size={48} />
            <p className="text-sm leading-snug text-paper">
              <span className="block text-[11px] font-bold tracking-wider text-lime uppercase">Haroldo</span>
              {reward.careerCompleted
                ? 'Você venceu todas as etapas. Campeão da Liga X.'
                : `Etapa “${cleared.title}” concluída.${
                    nextStage ? ` Agora é com o ${getCharacter(getBot(nextStage.botId).characterId).name}.` : ''
                  }`}
            </p>
          </div>
        )}

        <div className="relative mt-6 flex w-full flex-col gap-2">
          {config.mode === 'carreira' ? (
            <LinkButton href="/carreira" variant="lime" size="lg" block>
              Continuar carreira
            </LinkButton>
          ) : (
            <Button variant="lime" size="lg" block onClick={onRematch}>
              {outcome === 'win' ? 'Jogar mais uma' : 'Revanche'}
            </Button>
          )}
          {config.mode === 'carreira' && (
            <Button variant="dark" block className="bg-white/10" onClick={onRematch}>
              {outcome === 'win' ? 'Jogar de novo' : 'Revanche'}
            </Button>
          )}
          <Button variant="ghost" block className="text-paper/70" onClick={onClose}>
            Ver o tabuleiro
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
