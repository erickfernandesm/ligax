import type { Bot } from '@/core/domain/types';

// Os quatro bots usam a MESMA engine. O que muda é só esta configuração.
// Para criar um bot novo: adicione o personagem em characters.ts e um item aqui.

export const BOTS: Bot[] = [
  {
    id: 'tio-guilherme',
    characterId: 'tio-guilherme',
    difficulty: 'facil',
    difficultyLabel: 'Fácil',
    level: 1,
    playStyle: 'Joga solto e deixa você respirar.',
    pitch: 'Pra quem está começando ou quer pegar confiança.',
    recommendedForBeginners: true,
    engine: { skillLevel: 0, depth: 1, moveTimeMs: 200, blunderChance: 0.4, minThinkMs: 700 },
  },
  {
    id: 'tio-joao',
    characterId: 'tio-joao',
    difficulty: 'intermediario',
    difficultyLabel: 'Intermediário',
    level: 4,
    playStyle: 'Posicional. Vai apertando aos poucos.',
    pitch: 'Pra quem já conhece as regras e quer jogar com plano.',
    engine: { skillLevel: 3, depth: 4, moveTimeMs: 400, blunderChance: 0.12, minThinkMs: 900 },
  },
  {
    id: 'tio-renan',
    characterId: 'tio-renan',
    difficulty: 'avancado',
    difficultyLabel: 'Avançado',
    level: 7,
    playStyle: 'Ataque o tempo todo. Pune qualquer descuido.',
    pitch: 'Pra quem não deixa mais peça solta. Ou acha que não deixa.',
    engine: { skillLevel: 9, depth: 8, moveTimeMs: 700, blunderChance: 0.02, minThinkMs: 1000 },
  },
  {
    id: 'tio-marcao',
    characterId: 'tio-marcao',
    difficulty: 'mestre',
    difficultyLabel: 'Muito avançado',
    level: 10,
    playStyle: 'Cálculo profundo. Quase não erra.',
    pitch: 'O chefão. Vai precisar pensar em cada lance.',
    engine: { skillLevel: 20, depth: 14, moveTimeMs: 1500, blunderChance: 0, minThinkMs: 1200 },
  },
];

const byId = new Map(BOTS.map((b) => [b.id, b]));

export function getBot(id: string): Bot {
  const b = byId.get(id);
  if (!b) throw new Error(`Bot desconhecido: ${id}`);
  return b;
}

export function findBot(id: string | null | undefined): Bot | undefined {
  return id ? byId.get(id) : undefined;
}

export function randomBot(rng = Math.random): Bot {
  return BOTS[Math.floor(rng() * BOTS.length)];
}
