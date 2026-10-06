'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChessGame } from '@/core/chess/game';
import { START_FEN, type Color, type MoveInput } from '@/core/chess/types';
import type { FriendMatch, User } from '@/core/domain/types';
import { useSound } from '@/hooks/useSound';
import { api, errorMessage } from '@/services/api';
import { useSessionStore } from '@/stores/session';

/** Intervalo entre consultas. Cada consulta é uma requisição ao servidor. */
const POLL_MS = 1500;

/**
 * Partida online contra um amigo. O servidor guarda o estado e valida os
 * lances; aqui a tela consulta a cada segundo (a resposta é vazia quando nada
 * mudou) e mostra o próprio lance na hora, antes mesmo da confirmação.
 */
export function useFriendMatch(id: string) {
  const user = useSessionStore((s) => s.user);
  const setUser = useSessionStore((s) => s.setUser);
  const refreshUser = useSessionStore((s) => s.refresh);
  const { play, playMove } = useSound();
  const [match, setMatch] = useState<FriendMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const versionRef = useRef(0);
  const sending = useRef(false);
  /** true quando não há mais o que acompanhar (acabou ou o convite foi cancelado). */
  const closed = useRef(false);

  const accept = useCallback((next: FriendMatch) => {
    versionRef.current = next.version;
    if (next.status === 'finished') closed.current = true;
    setMatch(next);
  }, []);

  // entra na partida (quem abriu o link vira o segundo jogador) e passa a acompanhar
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!alive || closed.current) return;
      try {
        // aba em segundo plano não consulta: ninguém está olhando
        if (!sending.current && document.visibilityState !== 'hidden') {
          const data = await api<{ match: FriendMatch } | null>(`/api/matches/${id}?v=${versionRef.current}`);
          if (alive && data && !sending.current) accept(data.match);
        }
      } catch {
        /* oscilação de rede: tenta de novo no próximo ciclo */
      }
      timer = setTimeout(poll, POLL_MS);
    };
    (async () => {
      try {
        const { match: joined } = await api<{ match: FriendMatch }>(`/api/matches/${id}/join`, { method: 'POST' });
        if (!alive) return;
        accept(joined);
        timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (alive) setError(errorMessage(err));
      }
    })();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id, accept]);

  const game = useMemo(() => ChessGame.fromMoves(START_FEN, match?.moves ?? []), [match?.moves]);
  const snapshot = useMemo(() => game.snapshot(), [game]);

  const myColor: Color | null = !user || !match ? null : match.white?.id === user.id ? 'w' : match.black?.id === user.id ? 'b' : null;
  const myTurn = match?.status === 'playing' && myColor !== null && snapshot.turn === myColor;

  // som quando chega lance do adversário
  const seen = useRef(0);
  useEffect(() => {
    const count = snapshot.moves.length;
    if (count > seen.current && seen.current > 0) {
      const last = snapshot.moves[count - 1];
      if (last.color !== myColor) playMove(last);
    }
    seen.current = count;
  }, [snapshot.moves, myColor, playMove]);

  // fim de jogo: som e Score atualizado
  const finishedSeen = useRef(false);
  useEffect(() => {
    if (match?.status !== 'finished' || finishedSeen.current) return;
    finishedSeen.current = true;
    play(match.winner === null ? 'success' : match.winner === myColor ? 'win' : 'lose');
    void refreshUser();
  }, [match?.status, match?.winner, myColor, play, refreshUser]);

  const move = useCallback(
    async (input: MoveInput) => {
      if (!match || !myTurn || sending.current) return;
      const record = ChessGame.fromMoves(START_FEN, match.moves).move(input);
      if (!record) return;
      playMove(record);
      sending.current = true;
      const before = match;
      setMatch({ ...match, moves: [...match.moves, record.san] }); // mostra já
      try {
        const data = await api<{ match: FriendMatch; user: User }>(`/api/matches/${id}/move`, { body: input });
        accept(data.match);
        setUser(data.user);
      } catch (err) {
        setMatch(before);
        setShake((n) => n + 1);
        setError(errorMessage(err));
        setTimeout(() => setError(null), 3000);
      } finally {
        sending.current = false;
      }
    },
    [match, myTurn, id, accept, playMove, setUser],
  );

  const resign = useCallback(async () => {
    closed.current = true;
    try {
      const data = await api<{ match: FriendMatch; user: User }>(`/api/matches/${id}/resign`, { method: 'POST' });
      accept(data.match);
      setUser(data.user);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, [id, accept, setUser]);

  return { match, error, game, snapshot, myColor, myTurn, move, resign, shake };
}
