'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pickPhrase } from '@/content/characters';
import { uciToMove } from '@/core/chess/game';
import { type Color, type MoveInput, opposite } from '@/core/chess/types';
import type { Bot, GameMode, GameOutcome, Reward } from '@/core/domain/types';
import { chooseBotMove } from '@/core/engine';
import { useChessGame } from '@/hooks/useChessGame';
import { useSound } from '@/hooks/useSound';
import { getEngine } from '@/services/engine';
import { uid } from '@/services/storage';
import { useProgressStore } from '@/stores/progress';
import { useActiveGameStore } from '@/stores/settings';

export interface MatchConfig {
  id: string;
  bot: Bot;
  mode: GameMode;
  playerColor: Color;
  startFen: string;
  /** Lances já jogados (partida retomada). */
  moves: string[];
  startedAt: string;
}

export interface MatchResult {
  outcome: GameOutcome;
  reward: Reward;
  xpAfter: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Toda a lógica de uma partida contra um bot. A tela só desenha. */
export function useMatch(config: MatchConfig) {
  const { bot, mode, playerColor, startFen } = config;
  const botColor = opposite(playerColor);
  const game = useChessGame(startFen, config.moves);
  const { snapshot } = game;
  const { play, playMove } = useSound();

  const [gameId, setGameId] = useState(config.id);
  const [startedAt, setStartedAt] = useState(config.startedAt);
  const [thinking, setThinking] = useState(false);
  const [speech, setSpeech] = useState<string | null>(() => pickPhrase(bot.characterId, 'greeting'));
  const [result, setResult] = useState<MatchResult | null>(null);
  const [shake, setShake] = useState(0);
  const recorded = useRef<string | null>(null);
  const session = useRef(0); // muda a cada partida nova: descarta respostas atrasadas da engine

  const recordGame = useProgressStore((s) => s.recordGame);
  const recordCheck = useProgressStore((s) => s.recordCheck);
  const saveActive = useActiveGameStore((s) => s.save);
  const clearActive = useActiveGameStore((s) => s.clear);

  const playing = snapshot.status === 'playing';
  const playerTurn = playing && snapshot.turn === playerColor;

  // ── vez do bot ──
  useEffect(() => {
    if (!playing || snapshot.turn !== botColor) return;
    const mySession = session.current;
    let cancelled = false;
    setThinking(true);
    (async () => {
      const started = Date.now();
      const engine = await getEngine();
      const uci = await chooseBotMove(engine, snapshot.fen, bot.engine);
      const wait = bot.engine.minThinkMs - (Date.now() - started);
      if (wait > 0) await sleep(wait);
      if (cancelled || mySession !== session.current) return;
      setThinking(false);
      if (!uci) return;
      const record = game.move(uciToMove(uci));
      if (!record) return;
      playMove(record);
      if (record.isMate) return;
      if (record.isCheck) setSpeech(pickPhrase(bot.characterId, 'botCheck'));
      else if (record.captured && record.captured !== 'p') setSpeech(pickPhrase(bot.characterId, 'botCapture'));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, playing, gameId]);

  // ── salva a partida em andamento ──
  useEffect(() => {
    if (!playing) return;
    saveActive({ id: gameId, botId: bot.id, mode, playerColor, startFen, moves: game.sans(), startedAt });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.fen, playing, gameId]);

  // ── fim de jogo ──
  useEffect(() => {
    if (playing || recorded.current === gameId) return;
    recorded.current = gameId;
    setThinking(false);
    clearActive();
    const outcome: GameOutcome = snapshot.winner === null ? 'draw' : snapshot.winner === playerColor ? 'win' : 'loss';
    const reward = recordGame({
      id: gameId,
      bot,
      mode,
      outcome,
      reason: snapshot.status,
      playerColor,
      moveCount: Math.ceil(snapshot.moves.length / 2),
    });
    setSpeech(pickPhrase(bot.characterId, outcome === 'win' ? 'botLoses' : outcome === 'loss' ? 'botWins' : 'draw'));
    const xpAfter = useProgressStore.getState().progress.xp;
    // pequena pausa: deixa o último lance terminar de animar antes do resultado
    const id = setTimeout(() => {
      play(outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : 'success');
      setResult({ outcome, reward, xpAfter });
    }, 650);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, gameId]);

  const playerMove = useCallback(
    (input: MoveInput) => {
      if (!playerTurn) return;
      const record = game.move(input);
      if (!record) {
        setShake((n) => n + 1);
        play('error');
        return;
      }
      playMove(record);
      if (record.isCheck && mode !== 'laboratorio') recordCheck();
      if (record.isMate) return;
      if (record.isCheck) setSpeech(pickPhrase(bot.characterId, 'playerCheck'));
      else if (record.captured && record.captured !== 'p') setSpeech(pickPhrase(bot.characterId, 'playerCapture'));
    },
    [playerTurn, game, play, playMove, recordCheck, bot.characterId, mode],
  );

  const resign = useCallback(() => {
    if (!playing) return;
    session.current++;
    void getEngine().then((e) => e.stop());
    game.resign(playerColor);
  }, [playing, game, playerColor]);

  /** Começa outra partida com a mesma configuração. */
  const restart = useCallback(() => {
    session.current++;
    void getEngine().then((e) => e.stop());
    recorded.current = null;
    setResult(null);
    setThinking(false);
    setSpeech(pickPhrase(bot.characterId, 'greeting'));
    setStartedAt(new Date().toISOString());
    game.reset(startFen);
    setGameId(uid('g_'));
  }, [game, startFen, bot.characterId]);

  const canUndo = mode !== 'carreira' && playerTurn && !thinking && snapshot.moves.some((m) => m.color === playerColor);

  /** Volta o último lance do jogador (e a resposta do bot). Só fora da carreira. */
  const undo = useCallback(() => {
    if (!canUndo) return;
    const last = snapshot.moves[snapshot.moves.length - 1];
    game.undo(last.color === playerColor ? 1 : 2);
  }, [canUndo, snapshot.moves, game, playerColor]);

  return {
    game,
    snapshot,
    botColor,
    playing,
    playerTurn,
    thinking,
    speech,
    result,
    shake,
    closeResult: () => setResult(null),
    playerMove,
    resign,
    restart,
    undo,
    canUndo,
  };
}
