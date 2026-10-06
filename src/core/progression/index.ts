import {
  ACHIEVEMENTS,
  CAREER_STAGES,
  DAILY_CHALLENGE_BONUS_XP,
  HISTORY_LIMIT,
  LESSON_XP,
  LEVEL_TITLES,
  levelStartXp,
  MAX_LEVEL,
} from '@/content/progression';
import type { GameStatus, Color } from '../chess/types';
import type {
  Achievement,
  Bot,
  CareerStage,
  GameMode,
  GameOutcome,
  GameRecord,
  LevelInfo,
  PlayerProgress,
  Reward,
} from '../domain/types';

// Regras de progressão: funções puras. Recebem o progresso atual e devolvem o
// novo progresso + a recompensa a ser celebrada. Nada de UI nem de storage aqui.

export function createInitialProgress(): PlayerProgress {
  return {
    xp: 0,
    stats: {
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      currentStreak: 0,
      bestStreak: 0,
      checksGiven: 0,
      winsByBot: {},
      positionsSaved: 0,
      dailySolved: 0,
    },
    career: { stageIndex: 0, stageWins: 0, completed: false },
    achievements: {},
    challengesSolved: {},
    lessonsCompleted: {},
    teachCompleted: {},
    history: [],
    lastDailyDate: null,
  };
}

// ───────────────────────── Níveis ─────────────────────────

/** XP total em que o nível (1, 2, 3...) começa. */
export const xpForLevel = levelStartXp;

export function levelTitle(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const t of LEVEL_TITLES) if (level >= t.from) title = t.title;
  return title;
}

export function getLevelInfo(xp: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  const start = xpForLevel(level);
  const isMax = level >= MAX_LEVEL;
  // no nível máximo não existe "próximo": a barra fica cheia
  const nextLevelXp = isMax ? start : xpForLevel(level + 1);
  return {
    level,
    title: levelTitle(level),
    xp,
    levelStartXp: start,
    nextLevelXp,
    progress: isMax ? 1 : Math.min(1, (xp - start) / (nextLevelXp - start)),
  };
}

// ───────────────────────── Conquistas ─────────────────────────

export interface AchievementStatus {
  achievement: Achievement;
  unlockedAt: string | null;
  current: number;
  target: number;
}

export function achievementStatuses(p: PlayerProgress): AchievementStatus[] {
  return ACHIEVEMENTS.map((achievement) => {
    const { current, target } = achievement.measure(p);
    return {
      achievement,
      unlockedAt: p.achievements[achievement.id] ?? null,
      current: Math.min(current, target),
      target,
    };
  });
}

export function findAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

/** Fecha uma alteração: soma XP, destrava conquistas e monta a recompensa. */
function settle(before: PlayerProgress, draft: PlayerProgress, xpGained: number, date: string, extra: Partial<Reward> = {}) {
  const progress: PlayerProgress = { ...draft, xp: before.xp + xpGained, achievements: { ...draft.achievements } };
  const newAchievements: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (progress.achievements[a.id]) continue;
    const { current, target } = a.measure(progress);
    if (current >= target) {
      progress.achievements[a.id] = date;
      newAchievements.push(a.id);
    }
  }
  const reward: Reward = {
    xpGained,
    levelBefore: getLevelInfo(before.xp).level,
    levelAfter: getLevelInfo(progress.xp).level,
    newAchievements,
    ...extra,
  };
  return { progress, reward };
}

// ───────────────────────── Partidas ─────────────────────────

export interface GameResultInput {
  id: string;
  bot: Bot;
  mode: GameMode;
  outcome: GameOutcome;
  reason: GameStatus;
  playerColor: Color;
  moveCount: number;
  date: string;
}

export function applyGameResult(before: PlayerProgress, input: GameResultInput) {
  const { bot, mode, outcome } = input;
  // Partidas contra bots não dão XP: elas contam para estatísticas, carreira e conquistas.
  const xp = 0;
  const record: GameRecord = {
    id: input.id,
    botId: bot.id,
    mode,
    outcome,
    reason: input.reason,
    playerColor: input.playerColor,
    moveCount: input.moveCount,
    date: input.date,
  };
  const draft: PlayerProgress = {
    ...before,
    history: [record, ...before.history].slice(0, HISTORY_LIMIT),
  };

  // Partidas a partir de posições montadas ficam no histórico, mas não contam
  // para estatísticas, sequência nem carreira.
  if (mode === 'laboratorio') return settle(before, draft, 0, input.date);

  const stats = { ...before.stats, winsByBot: { ...before.stats.winsByBot } };
  stats.games += 1;
  if (outcome === 'win') {
    stats.wins += 1;
    stats.currentStreak += 1;
    stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    stats.winsByBot[bot.id] = (stats.winsByBot[bot.id] ?? 0) + 1;
  } else if (outcome === 'loss') {
    stats.losses += 1;
    stats.currentStreak = 0;
  } else {
    stats.draws += 1;
  }
  draft.stats = stats;

  const extra: Partial<Reward> = {};
  if (mode === 'carreira' && outcome === 'win' && !before.career.completed) {
    const stage = CAREER_STAGES[before.career.stageIndex];
    if (stage && stage.botId === bot.id) {
      const wins = before.career.stageWins + 1;
      if (wins >= stage.winsToAdvance) {
        const nextIndex = before.career.stageIndex + 1;
        const completed = nextIndex >= CAREER_STAGES.length;
        draft.career = {
          stageIndex: completed ? before.career.stageIndex : nextIndex,
          stageWins: completed ? wins : 0,
          completed,
        };
        extra.careerStageCleared = stage.id;
        extra.careerCompleted = completed;
      } else {
        draft.career = { ...before.career, stageWins: wins };
      }
    }
  }
  return settle(before, draft, xp, input.date, extra);
}

/** O jogador deu xeque (conta para a conquista "Primeiro Xeque"). */
export function applyCheckGiven(before: PlayerProgress, date: string) {
  const draft = { ...before, stats: { ...before.stats, checksGiven: before.stats.checksGiven + 1 } };
  return settle(before, draft, 0, date);
}

// ───────────────────────── Carreira ─────────────────────────

export interface CareerView {
  stages: { stage: CareerStage; state: 'done' | 'current' | 'locked'; wins: number }[];
  current: CareerStage | null;
  completed: boolean;
}

export function getCareerView(p: PlayerProgress): CareerView {
  const stages = CAREER_STAGES.map((stage, i) => {
    if (p.career.completed || i < p.career.stageIndex) {
      return { stage, state: 'done' as const, wins: stage.winsToAdvance };
    }
    if (i === p.career.stageIndex) return { stage, state: 'current' as const, wins: p.career.stageWins };
    return { stage, state: 'locked' as const, wins: 0 };
  });
  return {
    stages,
    current: p.career.completed ? null : CAREER_STAGES[p.career.stageIndex] ?? null,
    completed: p.career.completed,
  };
}

// ───────────────────────── Desafios, ensino e aulas ─────────────────────────

export function applyChallengeSolved(
  before: PlayerProgress,
  challenge: { id: string; xp: number },
  opts: { date: string; isDaily: boolean },
) {
  const first = !before.challengesSolved[challenge.id];
  const today = opts.date.slice(0, 10);
  const dailyBonus = opts.isDaily && before.lastDailyDate !== today;
  const draft: PlayerProgress = {
    ...before,
    challengesSolved: first ? { ...before.challengesSolved, [challenge.id]: opts.date } : before.challengesSolved,
    lastDailyDate: dailyBonus ? today : before.lastDailyDate,
    stats: dailyBonus ? { ...before.stats, dailySolved: before.stats.dailySolved + 1 } : before.stats,
  };
  const xp = (first ? challenge.xp : 0) + (dailyBonus ? DAILY_CHALLENGE_BONUS_XP : 0);
  return settle(before, draft, xp, opts.date);
}

export function applyTeachCompleted(before: PlayerProgress, module: { id: string; xp: number }, date: string) {
  const first = !before.teachCompleted[module.id];
  const draft: PlayerProgress = first
    ? { ...before, teachCompleted: { ...before.teachCompleted, [module.id]: date } }
    : before;
  return settle(before, draft, first ? module.xp : 0, date);
}

export function applyLessonCompleted(before: PlayerProgress, lessonId: string, date: string) {
  const first = !before.lessonsCompleted[lessonId];
  const draft: PlayerProgress = first
    ? { ...before, lessonsCompleted: { ...before.lessonsCompleted, [lessonId]: date } }
    : before;
  return settle(before, draft, first ? LESSON_XP : 0, date);
}

export function applyPositionSaved(before: PlayerProgress, date: string) {
  const draft = { ...before, stats: { ...before.stats, positionsSaved: before.stats.positionsSaved + 1 } };
  return settle(before, draft, 0, date);
}

export function winRate(p: PlayerProgress): number {
  return p.stats.games === 0 ? 0 : Math.round((p.stats.wins / p.stats.games) * 100);
}
