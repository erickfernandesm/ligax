import type { Achievement, CareerStage, GameOutcome } from '@/core/domain/types';

// Toda a "economia" da progressão fica aqui. Mexa nos números à vontade:
// a lógica (em /core/progression) lê tudo desta configuração.

// ── Nível da conta: de 1 a 100 ──
// O nível sobe com XP, e XP vem só de ESTUDO: desafios resolvidos, aulas
// assistidas e lições do Modo Ensino. Partidas não dão XP (as online dão Score).
export const MAX_LEVEL = 100;
/** Curva de XP: cada nível custa um pouco mais que o anterior. */
const LEVEL_BASE_XP = 40;
const LEVEL_GROWTH_XP = 2;

/** XP total em que o nível começa (nível 1 = 0, nível 2 = 42, nível 10 = 522, nível 100 = 23.562). */
export function levelStartXp(level: number): number {
  const n = Math.max(0, Math.min(MAX_LEVEL, level) - 1);
  return LEVEL_BASE_XP * n + LEVEL_GROWTH_XP * n * n;
}

/** Título do jogador por faixa de nível. */
export const LEVEL_TITLES: { from: number; title: string }[] = [
  { from: 1, title: 'Peão' },
  { from: 10, title: 'Cavalo' },
  { from: 25, title: 'Bispo' },
  { from: 45, title: 'Torre' },
  { from: 70, title: 'Dama' },
  { from: 90, title: 'Rei' },
];

/** XP por assistir uma aula em vídeo. */
export const LESSON_XP = 40;

// ── Score: só partidas online contra outras pessoas ──
/** Pontos por resultado. Derrota não tira pontos. */
export const ONLINE_SCORE: Record<GameOutcome, number> = { win: 25, draw: 10, loss: 0 };
/** Partidas com menos lances (somando os dois lados) que isto não valem Score. */
export const ONLINE_MIN_PLIES_FOR_SCORE = 6;
export const DAILY_CHALLENGE_BONUS_XP = 20;
export const HISTORY_LIMIT = 30;

export const CAREER_STAGES: CareerStage[] = [
  {
    id: 'etapa-guilherme',
    botId: 'tio-guilherme',
    title: 'Primeiros passos',
    description: 'Vença o Tio Guilherme 2 vezes.',
    winsToAdvance: 2,
  },
  {
    id: 'etapa-joao',
    botId: 'tio-joao',
    title: 'Jogo de posição',
    description: 'Vença o Tio João 2 vezes.',
    winsToAdvance: 2,
  },
  {
    id: 'etapa-renan',
    botId: 'tio-renan',
    title: 'Fogo cruzado',
    description: 'Vença o Tio Renan 2 vezes.',
    winsToAdvance: 2,
  },
  {
    id: 'etapa-marcao',
    botId: 'tio-marcao',
    title: 'O chefão',
    description: 'Vença o Tio Marcão 1 vez.',
    winsToAdvance: 1,
  },
];

const count = (r: Record<string, string>) => Object.keys(r).length;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primeira-vitoria',
    icon: 'trophy',
    title: 'Primeira Vitória',
    description: 'Vença sua primeira partida.',
    measure: (p) => ({ current: p.stats.wins, target: 1 }),
  },
  {
    id: 'primeiro-xeque',
    icon: 'check',
    title: 'Primeiro Xeque',
    description: 'Aplique seu primeiro xeque.',
    measure: (p) => ({ current: p.stats.checksGiven, target: 1 }),
  },
  {
    id: 'sequencia-3',
    icon: 'zap',
    title: 'Embalado',
    description: 'Vença 3 partidas seguidas.',
    measure: (p) => ({ current: p.stats.bestStreak, target: 3 }),
  },
  {
    id: 'sequencia-5',
    icon: 'flame',
    title: 'Sequência de 5',
    description: 'Vença 5 partidas seguidas.',
    measure: (p) => ({ current: p.stats.bestStreak, target: 5 }),
  },
  {
    id: 'dez-partidas',
    icon: 'target',
    title: 'Casa Cheia',
    description: 'Jogue 10 partidas.',
    measure: (p) => ({ current: p.stats.games, target: 10 }),
  },
  {
    id: 'venceu-joao',
    icon: 'compass',
    title: 'Plano Melhor',
    description: 'Vença o Tio João.',
    measure: (p) => ({ current: p.stats.winsByBot['tio-joao'] ?? 0, target: 1 }),
  },
  {
    id: 'venceu-renan',
    icon: 'shield',
    title: 'Sobreviveu ao Ataque',
    description: 'Vença o Tio Renan.',
    measure: (p) => ({ current: p.stats.winsByBot['tio-renan'] ?? 0, target: 1 }),
  },
  {
    id: 'venceu-marcao',
    icon: 'crown',
    title: 'Derrubou o Chefão',
    description: 'Vença o Tio Marcão.',
    measure: (p) => ({ current: p.stats.winsByBot['tio-marcao'] ?? 0, target: 1 }),
  },
  {
    id: 'campeao-carreira',
    icon: 'medal',
    title: 'Campeão da Liga',
    description: 'Complete todas as etapas da carreira.',
    measure: (p) => ({ current: p.career.completed ? 1 : 0, target: 1 }),
  },
  {
    id: 'primeira-licao',
    icon: 'book',
    title: 'Primeira Lição',
    description: 'Conclua um módulo do Modo Ensino.',
    measure: (p) => ({ current: count(p.teachCompleted), target: 1 }),
  },
  {
    id: 'aluno-dedicado',
    icon: 'brain',
    title: 'Aluno Dedicado',
    description: 'Assista 10 aulas.',
    measure: (p) => ({ current: count(p.lessonsCompleted), target: 10 }),
  },
  {
    id: 'primeiro-desafio',
    icon: 'puzzle',
    title: 'Matou a Charada',
    description: 'Resolva seu primeiro desafio.',
    measure: (p) => ({ current: count(p.challengesSolved), target: 1 }),
  },
  {
    id: 'desafiante',
    icon: 'swords',
    title: 'Desafiante',
    description: 'Resolva 20 desafios.',
    measure: (p) => ({ current: count(p.challengesSolved), target: 20 }),
  },
  {
    id: 'desafio-diario',
    icon: 'calendar',
    title: 'Todo Dia',
    description: 'Resolva 3 desafios do dia.',
    measure: (p) => ({ current: p.stats.dailySolved, target: 3 }),
  },
  {
    id: 'nivel-5',
    icon: 'star',
    title: 'Nível 5',
    description: 'Chegue ao nível 5.',
    measure: (p) => ({ current: p.xp, target: levelStartXp(5) }),
  },
  {
    id: 'cientista',
    icon: 'flask',
    title: 'Cientista do Tabuleiro',
    description: 'Salve uma posição no Laboratório.',
    measure: (p) => ({ current: p.stats.positionsSaved, target: 1 }),
  },
];
