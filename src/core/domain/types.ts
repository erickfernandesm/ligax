// Entidades da plataforma. Hoje os dados vivem no aparelho (ver /services);
// estes mesmos tipos servem de contrato para uma API/banco no futuro.

import type { Annotations, Color, GameStatus } from '../chess/types';
import type { BotEngineConfig } from '../engine/bot-player';

// ───────────────────────── Personagens ─────────────────────────

export type PhraseEvent =
  | 'greeting'
  | 'thinking'
  | 'botCapture'
  | 'botCheck'
  | 'playerCapture'
  | 'playerCheck'
  | 'botWins'
  | 'botLoses'
  | 'draw';

export interface Character {
  id: string;
  name: string;
  /** Como o personagem é apresentado: "Professor de Tática"... */
  role: string;
  tagline: string;
  description: string;
  personality: string[];
  /** Cor de destaque do personagem (hex). */
  accent: string;
  /**
   * Caminho da caricatura. Normalmente fica vazio: o sistema procura sozinho
   * por /assets/characters/<id>.png e, se não achar, usa a silhueta.
   */
  avatar?: string;
  phrases: Partial<Record<PhraseEvent, string[]>>;
}

// ───────────────────────── Bots ─────────────────────────

export type Difficulty = 'facil' | 'intermediario' | 'avancado' | 'mestre';

export interface Bot {
  id: string;
  characterId: string;
  difficulty: Difficulty;
  difficultyLabel: string;
  /** Nível exibido no card (1–10). */
  level: number;
  playStyle: string;
  /** Para quem é indicado. */
  pitch: string;
  recommendedForBeginners?: boolean;
  engine: BotEngineConfig;
}

// ───────────────────────── Partidas ─────────────────────────

export type GameMode = 'treino' | 'carreira' | 'laboratorio';
export type GameOutcome = 'win' | 'loss' | 'draw';

export interface GameRecord {
  id: string;
  botId: string;
  mode: GameMode;
  outcome: GameOutcome;
  reason: GameStatus;
  playerColor: Color;
  moveCount: number;
  date: string;
}

/** Partida em andamento, salva para "Continuar jogando". */
export interface ActiveGame {
  id: string;
  botId: string;
  mode: GameMode;
  playerColor: Color;
  startFen: string;
  moves: string[];
  startedAt: string;
}

// ───────────────────────── Progressão ─────────────────────────

export interface PlayerStats {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  currentStreak: number;
  bestStreak: number;
  checksGiven: number;
  winsByBot: Record<string, number>;
  positionsSaved: number;
  dailySolved: number;
}

export interface CareerState {
  /** Índice da etapa atual em CAREER_STAGES. */
  stageIndex: number;
  /** Vitórias já conquistadas na etapa atual. */
  stageWins: number;
  completed: boolean;
}

export interface PlayerProgress {
  xp: number;
  stats: PlayerStats;
  career: CareerState;
  /** id → data ISO do desbloqueio/conclusão. */
  achievements: Record<string, string>;
  challengesSolved: Record<string, string>;
  lessonsCompleted: Record<string, string>;
  teachCompleted: Record<string, string>;
  history: GameRecord[];
  /** Último dia (AAAA-MM-DD) em que o desafio diário foi resolvido. */
  lastDailyDate: string | null;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  /** XP em que o nível atual começa. */
  levelStartXp: number;
  /** XP necessário para o próximo nível. */
  nextLevelXp: number;
  /** 0–1 dentro do nível atual. */
  progress: number;
}

export interface CareerStage {
  id: string;
  botId: string;
  title: string;
  description: string;
  winsToAdvance: number;
}

export interface Reward {
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  newAchievements: string[];
  /** Etapa da carreira vencida nesta recompensa, se houver. */
  careerStageCleared?: string;
  careerCompleted?: boolean;
}

export interface Achievement {
  id: string;
  /** Nome do ícone (ver components/progression/AchievementIcon). */
  icon: string;
  title: string;
  description: string;
  /** Progresso atual e meta — a conquista sai quando atual >= meta. */
  measure: (p: PlayerProgress) => { current: number; target: number };
}

// ───────────────────────── Desafios ─────────────────────────

export type ChallengeType =
  | 'mate-1'
  | 'mate-2'
  | 'mate-3'
  | 'best-move'
  | 'win-material'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'endgame'
  | 'historic'
  | 'timed'
  | 'daily';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  /** O pedido, na voz do Haroldo. */
  prompt: string;
  fen: string;
  /**
   * Linha principal em SAN, começando pelo lance do jogador e alternando com as
   * respostas do adversário.
   */
  solution: string[];
  /** Para desafios de mate: qualquer lance que mantenha o mate em N é aceito. */
  mateIn?: number;
  /** Grupo de progressão (1 = aquecimento). */
  tier: number;
  xp: number;
  hint: string;
  successText: string;
  failText: string;
  /** Limite de tempo em segundos (desafios por tempo). */
  timeLimitSec?: number;
  /** 'liga' = conteúdo oficial; 'professor' = criado no Laboratório. */
  source: 'liga' | 'professor';
  authorName?: string;
}

export interface ChallengeTier {
  tier: number;
  title: string;
  description: string;
  /** Quantos desafios do grupo anterior liberam este. */
  unlockAfter: number;
}

// ───────────────────────── Modo Ensino ─────────────────────────

interface TeachStepBase {
  /** Fala do professor. Curta: um balão por vez. */
  text: string;
  /** Troca a posição do tabuleiro antes do passo. */
  fen?: string;
  squares?: Annotations['squares'];
  arrows?: Annotations['arrows'];
}

/** O professor fala; o aluno toca em "Continuar". */
export interface TeachSayStep extends TeachStepBase {
  kind: 'say';
}

/** O professor mostra lances no tabuleiro. */
export interface TeachDemoStep extends TeachStepBase {
  kind: 'demo';
  moves: string[];
}

/** O aluno precisa jogar um dos lances esperados. */
export interface TeachPlayStep extends TeachStepBase {
  kind: 'play';
  /** Lances aceitos, em SAN. */
  expect: string[];
  /** Dica mostrada depois de um erro (junto com uma seta para o primeiro lance esperado). */
  hint: string;
  successText: string;
  /** Resposta automática do adversário depois do acerto (SAN). */
  reply?: string;
}

export type TeachStep = TeachSayStep | TeachDemoStep | TeachPlayStep;

export interface TeachModule {
  id: string;
  professorId: string;
  title: string;
  summary: string;
  concept: string;
  minutes: number;
  xp: number;
  steps: TeachStep[];
}

// ───────────────────────── Aulas ─────────────────────────

export type LessonCategory = 'fundamentos' | 'estrategia' | 'tatica' | 'finais' | 'avancado';
export type LessonLevel = 'iniciante' | 'intermediario' | 'avancado';

export interface Professor {
  id: string;
  /** Liga o professor a um personagem (avatar, cor, frases). */
  characterId?: string;
  name: string;
  title: string;
  area: LessonCategory;
  bio: string;
  /** Avatar próprio para professores cadastrados pelo painel. */
  avatar?: string;
  accent?: string;
  published: boolean;
}

export type VideoSource =
  | { kind: 'youtube'; url: string }
  | { kind: 'url'; url: string }
  /** Arquivo enviado pelo painel; fica no servidor e é servido em /api/media/<mediaId>. */
  | { kind: 'upload'; mediaId: string; name: string };

/** Posição que acompanha a aula ("Agora pratique"), guardada junto com ela. */
export interface LessonPractice {
  name: string;
  description: string;
  fen: string;
  annotations: Annotations;
}

export interface Lesson {
  id: string;
  professorId: string;
  number: number;
  title: string;
  description: string;
  category: LessonCategory;
  level: LessonLevel;
  minutes: number;
  thumbnail?: string;
  video?: VideoSource | null;
  /** Pontos principais da aula, em texto. */
  keyPoints: string[];
  /** Posição para praticar depois do vídeo. */
  practice?: LessonPractice | null;
  published: boolean;
  createdAt: string;
}

// ───────────────────────── Laboratório ─────────────────────────

export interface SavedPosition {
  id: string;
  name: string;
  description: string;
  fen: string;
  annotations: Annotations;
  /** Lances jogados a partir da posição (SAN). */
  moves: string[];
  /** 'liga' = posição oficial que acompanha uma aula. */
  source: 'user' | 'liga';
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────── Usuário ─────────────────────────

/** aluno: joga e estuda. professor: também publica aulas. admin: também gerencia contas. */
export type UserRole = 'aluno' | 'professor' | 'admin';

export interface User {
  id: string;
  /** Nick: é como o jogador aparece para os outros. */
  name: string;
  email: string;
  role: UserRole;
  avatarColor: string;
  /** Pontos ganhos em partidas online contra outras pessoas. */
  score: number;
  online: OnlineStats;
  createdAt: string;
}

export interface OnlineStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface RankingEntry {
  id: string;
  name: string;
  avatarColor: string;
  score: number;
  wins: number;
}

// ───────────────────────── Partida entre amigos ─────────────────────────

export interface FriendPlayer {
  id: string;
  name: string;
  avatarColor: string;
}

export type FriendMatchStatus = 'waiting' | 'playing' | 'finished';

/** Estado de uma partida online entre duas contas, como o servidor devolve. */
export interface FriendMatch {
  /** Código curto do convite. */
  id: string;
  white: FriendPlayer | null;
  black: FriendPlayer | null;
  hostId: string;
  status: FriendMatchStatus;
  /** Lances em SAN desde a posição inicial. */
  moves: string[];
  /** Por que acabou (quando acabou). */
  reason: GameStatus | null;
  winner: Color | null;
  /** Cresce a cada mudança; o cliente usa para saber se há novidade. */
  version: number;
  createdAt: string;
  updatedAt: string;
}
