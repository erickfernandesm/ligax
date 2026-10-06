'use client';

import { Copy, Flag, History, RefreshCw, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CapturedRow, MoveList, PromotionPicker } from '@/components/board/BoardExtras';
import { ChessBoard } from '@/components/board/ChessBoard';
import { PlayerAvatar } from '@/components/characters/CharacterAvatar';
import { ThinkingDots } from '@/components/characters/SpeechBubble';
import { NightPanel, PlayScreen } from '@/components/layout/PlayScreen';
import { Button, IconButton, LinkButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Sheet } from '@/components/ui/Sheet';
import { ONLINE_MIN_PLIES_FOR_SCORE, ONLINE_SCORE } from '@/content/progression';
import { STATUS_LABEL } from '@/core/chess/game';
import { materialInfo } from '@/core/chess/material';
import { opposite } from '@/core/chess/types';
import type { FriendPlayer } from '@/core/domain/types';
import { useBoardInput } from '@/hooks/useBoardInput';
import { shareLink } from '@/services/share';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { useFriendMatch } from './useFriendMatch';

/** Partida online entre duas contas. */
export function FriendMatchScreen({ id }: { id: string }) {
  const m = useFriendMatch(id);
  const { match, snapshot, myColor } = m;
  const user = useSessionStore((s) => s.user);
  const showCoords = useSettingsStore((s) => s.showCoords);
  const [flipped, setFlipped] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmResign, setConfirmResign] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const input = useBoardInput({
    board: snapshot.board,
    movable: m.myTurn ? myColor : null,
    getTargets: m.game.legalTargets.bind(m.game),
    needsPromotion: m.game.needsPromotion.bind(m.game),
    onMove: (move) => void m.move(move),
  });

  useEffect(() => {
    if (match?.status === 'finished') setResultOpen(true);
  }, [match?.status]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(t);
  }, [notice]);

  if (m.error && !match) {
    return (
      <PlayScreen title="Partida com amigo" backHref="/amigo">
        <div className="pt-10 text-center">
          <p className="display text-4xl text-paper">Não deu pra entrar</p>
          <p className="mt-2 text-paper/75">{m.error}</p>
          <LinkButton href="/amigo" variant="lime" className="mt-6">
            Voltar
          </LinkButton>
        </div>
      </PlayScreen>
    );
  }
  if (!match || !user) {
    return (
      <PlayScreen title="Partida com amigo" backHref="/amigo">
        <p className="pt-10 text-center text-paper/70">
          Entrando na partida <ThinkingDots className="ml-1" />
        </p>
      </PlayScreen>
    );
  }

  const mine = myColor ?? 'w';
  const opponent: FriendPlayer | null = mine === 'w' ? match.black : match.white;
  const orientation = flipped ? opposite(mine) : mine;
  const material = materialInfo(snapshot.board);
  const myAdvantage = (mine === 'w' ? 1 : -1) * material.balance;
  const inviteUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/amigo/${match.id}`;

  const share = async () => {
    const result = await shareLink(inviteUrl, 'Bora jogar xadrez na Liga X?');
    if (result === 'copied') setNotice('Link copiado.');
    if (result === 'failed') setNotice('Não deu pra copiar. Passe o código.');
  };
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(match.id);
      setNotice('Código copiado.');
    } catch {
      setNotice('Não deu pra copiar. Anote o código.');
    }
  };

  const finished = match.status === 'finished';
  const outcome = !finished ? null : match.winner === null ? 'draw' : match.winner === mine ? 'win' : 'loss';
  const scored = finished && match.moves.length >= ONLINE_MIN_PLIES_FOR_SCORE;

  let status: { text: string; tone: 'lime' | 'idle' | 'danger' };
  if (match.status === 'waiting') status = { text: 'Aguardando amigo', tone: 'idle' };
  else if (finished) status = { text: outcome === 'draw' ? 'Empate' : outcome === 'win' ? 'Você venceu' : `${opponent?.name ?? 'Adversário'} venceu`, tone: 'idle' };
  else if (m.myTurn) status = snapshot.inCheck ? { text: 'Xeque! Sua vez', tone: 'danger' } : { text: 'Sua vez', tone: 'lime' };
  else status = { text: 'Vez do adversário', tone: 'idle' };

  return (
    <PlayScreen
      title={opponent ? `Contra ${opponent.name}` : 'Partida com amigo'}
      kicker={`Online · código ${match.id}`}
      backHref="/amigo"
      chrome={330}
      actions={
        <IconButton label="Girar tabuleiro" tone="night" active={flipped} onClick={() => setFlipped((f) => !f)}>
          <RefreshCw size={20} />
        </IconButton>
      }
    >
      {/* adversário */}
      <div className="flex min-h-12 items-center gap-3">
        {opponent ? (
          <>
            <PlayerAvatar name={opponent.name} color={opponent.avatarColor} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-paper">{opponent.name}</p>
              <CapturedRow pieces={material.lost[mine]} pieceColor={mine} advantage={-myAdvantage} />
            </div>
            {match.status === 'playing' && !m.myTurn && (
              <span className="flex items-center gap-2 text-sm text-lime">
                pensando <ThinkingDots />
              </span>
            )}
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-paper/75">
            Esperando seu amigo entrar <ThinkingDots />
          </p>
        )}
      </div>

      <div className="play-board">
        <ChessBoard
          board={snapshot.board}
          orientation={orientation}
          lastMove={snapshot.lastMove}
          checkSquare={snapshot.checkSquare}
          showCoords={showCoords}
          shakeKey={m.shake}
          {...input.boardProps}
        />
      </div>

      {/* você */}
      <div className="flex items-center gap-3">
        <PlayerAvatar name={user.name} color={user.avatarColor} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-paper">
            {user.name} <span className="font-medium text-paper/50">· {mine === 'w' ? 'brancas' : 'pretas'}</span>
          </p>
          <CapturedRow pieces={material.lost[opposite(mine)]} pieceColor={opposite(mine)} advantage={myAdvantage} />
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

      {m.error && (
        <p role="alert" className="rounded-xl bg-danger/20 px-3 py-2 text-sm font-bold text-paper">
          {m.error}
        </p>
      )}

      {match.status === 'waiting' ? (
        <NightPanel className="text-center">
          <p className="text-sm text-paper/70">Passe este código ou o link para o seu amigo</p>
          <p className="display mt-1 text-[52px] tracking-[0.18em] text-lime" aria-label={`Código ${match.id.split('').join(' ')}`}>
            {match.id}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="lime" block icon={<Share2 size={18} />} onClick={share}>
              Enviar convite
            </Button>
            <Button variant="dark" block className="bg-white/10" icon={<Copy size={18} />} onClick={copyCode}>
              Copiar código
            </Button>
          </div>
          <Button variant="ghost" block className="mt-1 text-paper/60" onClick={() => void m.resign().then(() => (window.location.href = '/amigo'))}>
            Cancelar convite
          </Button>
        </NightPanel>
      ) : (
        <div className="flex gap-2">
          {finished ? (
            <>
              <LinkButton href="/amigo" variant="lime" size="sm" className="flex-1">
                Nova partida
              </LinkButton>
              <Button variant="dark" size="sm" className="flex-1 bg-white/10" onClick={() => setResultOpen(true)}>
                Ver resultado
              </Button>
            </>
          ) : (
            <Button variant="dark" size="sm" className="flex-1 bg-white/10" icon={<Flag size={17} />} onClick={() => setConfirmResign(true)}>
              Desistir
            </Button>
          )}
          <Button variant="dark" size="sm" className="wide:hidden flex-1 bg-white/10" icon={<History size={17} />} onClick={() => setHistoryOpen(true)}>
            Lances
          </Button>
        </div>
      )}

      <NightPanel className="wide:block hidden">
        <p className="mb-2 text-[11px] font-bold tracking-wider text-paper/50 uppercase">Lances</p>
        <div className="max-h-[38dvh] overflow-y-auto">
          <MoveList moves={snapshot.moves} />
        </div>
      </NightPanel>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4" role="status">
          <span className="animate-rise rounded-full bg-paper px-5 py-3 text-sm font-bold text-night shadow-xl">{notice}</span>
        </div>
      )}

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Lances" tone="night">
        <MoveList moves={snapshot.moves} />
      </Sheet>

      <PromotionPicker color={input.promotion?.color ?? null} onChoose={input.choosePromotion} onCancel={input.cancelPromotion} />

      <Sheet open={confirmResign} onClose={() => setConfirmResign(false)} title="Desistir da partida?">
        <p className="text-[15px] text-olive">Vai contar como derrota, e seu amigo leva os pontos de Score.</p>
        <div className="mt-5 flex flex-col gap-2">
          <Button variant="outline" block onClick={() => setConfirmResign(false)}>
            Continuar jogando
          </Button>
          <Button
            variant="danger"
            block
            onClick={() => {
              setConfirmResign(false);
              void m.resign();
            }}
          >
            Desistir
          </Button>
        </div>
      </Sheet>

      {finished && outcome && (
        <Sheet open={resultOpen} onClose={() => setResultOpen(false)} tone="night" variant="center">
          <div className="relative flex flex-col items-center text-center">
            {outcome === 'win' && <div className="rays pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2" aria-hidden />}
            <h2 className={cn('display animate-pop relative text-[64px]', outcome === 'win' ? 'text-lime' : 'text-paper')}>
              {outcome === 'win' ? 'Vitória!' : outcome === 'loss' ? 'Derrota' : 'Empate'}
            </h2>
            <p className="relative -mt-1 text-sm text-paper/60">{match.reason ? STATUS_LABEL[match.reason] : ''}</p>
            <div className="relative mt-5 w-full rounded-2xl bg-white/[0.08] p-4">
              {scored ? (
                <>
                  <p className="display text-5xl text-lime">+{ONLINE_SCORE[outcome]}</p>
                  <p className="text-sm font-bold tracking-wider text-paper/70 uppercase">de Score</p>
                </>
              ) : (
                <p className="text-sm text-paper/70">Partida curta demais: não valeu Score.</p>
              )}
              <p className="mt-2 text-sm text-paper/80">
                Seu Score agora: <span className="font-bold text-paper">{user.score}</span>
              </p>
            </div>
            <div className="relative mt-6 flex w-full flex-col gap-2">
              <LinkButton href="/amigo" variant="lime" size="lg" block>
                Jogar outra
              </LinkButton>
              <Button variant="ghost" block className="text-paper/70" onClick={() => setResultOpen(false)}>
                Ver o tabuleiro
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </PlayScreen>
  );
}
