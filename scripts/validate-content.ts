// Confere todo o conteúdo configurável: posições, soluções dos desafios,
// lances dos módulos de ensino, referências entre aulas/professores/posições.
// Rode com: npm run validate
import { Chess, validateFen } from 'chess.js';
import { BOTS } from '../src/content/bots';
import { CHARACTERS } from '../src/content/characters';
import { CHALLENGES, CHALLENGE_TIERS } from '../src/content/challenges';
import { SEED_LESSONS, SEED_POSITIONS, SEED_PROFESSORS } from '../src/content/lessons';
import { ACHIEVEMENTS, CAREER_STAGES } from '../src/content/progression';
import { TEACH_MODULES } from '../src/content/teaching';
import { canForceMate, moveKeepsMate } from '../src/core/chess/mate';
import { isSquare } from '../src/core/chess/fen';
import { normalizeSan } from '../src/core/challenges';

const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
const unique = (where: string, ids: string[]) => {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(where, `id repetido "${id}"`);
    seen.add(id);
  }
};

// ── personagens e bots ──
unique('characters', CHARACTERS.map((c) => c.id));
unique('bots', BOTS.map((b) => b.id));
for (const b of BOTS) {
  if (!CHARACTERS.some((c) => c.id === b.characterId)) fail(`bot ${b.id}`, 'personagem inexistente');
}
for (const s of CAREER_STAGES) {
  if (!BOTS.some((b) => b.id === s.botId)) fail(`carreira ${s.id}`, 'bot inexistente');
}
unique('achievements', ACHIEVEMENTS.map((a) => a.id));

// ── desafios ──
unique('challenges', CHALLENGES.map((c) => c.id));
for (const c of CHALLENGES) {
  const where = `desafio ${c.id}`;
  if (!validateFen(c.fen).ok) {
    fail(where, 'FEN inválido');
    continue;
  }
  if (!CHALLENGE_TIERS.some((t) => t.tier === c.tier)) fail(where, `grupo ${c.tier} não existe`);
  const chess = new Chess(c.fen);
  if (c.mateIn) {
    const t0 = Date.now();
    if (!canForceMate(new Chess(c.fen), c.mateIn)) fail(where, `não há mate forçado em ${c.mateIn}`);
    if (c.mateIn > 1 && canForceMate(new Chess(c.fen), c.mateIn - 1)) fail(where, `existe mate mais curto que ${c.mateIn}`);
    const ms = Date.now() - t0;
    if (ms > 1500) fail(where, `verificação de mate lenta demais (${ms} ms)`);
    // quantos primeiros lances resolvem?
    const firsts = chess.moves({ verbose: true }).filter((m) => moveKeepsMate(c.fen, m, c.mateIn!));
    if (!firsts.some((m) => normalizeSan(m.san) === normalizeSan(c.solution[0]))) {
      fail(where, `o primeiro lance da solução (${c.solution[0]}) não mantém o mate`);
    }
    console.log(`  ${c.id}: mate em ${c.mateIn} ok — lances que resolvem: ${firsts.map((m) => m.san).join(', ')} (${ms} ms)`);
  }
  for (const [i, san] of c.solution.entries()) {
    try {
      const m = chess.move(san);
      if (m.san !== san) fail(where, `lance ${i + 1}: escrito "${san}", o correto é "${m.san}"`);
    } catch {
      fail(where, `lance ${i + 1} ilegal: ${san}`);
      break;
    }
  }
  if (c.solution.length % 2 === 0) fail(where, 'a solução deve terminar num lance do jogador');
  if (c.mateIn && !chess.isCheckmate()) fail(where, 'a linha principal não termina em mate');
}

// ── modo ensino ──
unique('teach modules', TEACH_MODULES.map((m) => m.id));
for (const mod of TEACH_MODULES) {
  const where = `ensino ${mod.id}`;
  if (!SEED_PROFESSORS.some((p) => p.id === mod.professorId)) fail(where, 'professor inexistente');
  if (!mod.steps[0]?.fen) fail(where, 'o primeiro passo precisa de uma posição (fen)');
  let chess: Chess | null = null;
  mod.steps.forEach((step, i) => {
    const sw = `${where} passo ${i + 1}`;
    if (step.fen) {
      if (!validateFen(step.fen).ok) return fail(sw, 'FEN inválido');
      chess = new Chess(step.fen);
    }
    if (!chess) return;
    for (const s of step.squares ?? []) if (!isSquare(s.square)) fail(sw, `casa inválida ${s.square}`);
    for (const a of step.arrows ?? []) {
      if (!isSquare(a.from) || !isSquare(a.to)) fail(sw, `seta inválida ${a.from}-${a.to}`);
    }
    if (step.text.length > 150) fail(sw, `texto longo demais para um balão (${step.text.length})`);
    if (step.kind === 'demo') {
      for (const san of step.moves) {
        try {
          chess.move(san);
        } catch {
          fail(sw, `lance de demonstração ilegal: ${san}`);
        }
      }
    }
    if (step.kind === 'play') {
      const legal = chess.moves();
      const ok = step.expect.filter((e) => legal.includes(e));
      if (ok.length === 0) return fail(sw, `nenhum lance esperado é legal: ${step.expect.join(', ')}`);
      // todo lance aceito precisa permitir a resposta programada
      for (const e of ok) {
        const probe = new Chess(chess.fen());
        probe.move(e);
        if (step.reply) {
          try {
            probe.move(step.reply);
          } catch {
            fail(sw, `resposta "${step.reply}" ilegal depois de ${e}`);
          }
        }
      }
      chess.move(ok[0]);
      if (step.reply) {
        try {
          chess.move(step.reply);
        } catch {
          /* já reportado */
        }
      }
    }
  });
}

// ── aulas ──
unique('professores', SEED_PROFESSORS.map((p) => p.id));
unique('aulas', SEED_LESSONS.map((l) => l.id));
unique('posições', SEED_POSITIONS.map((p) => p.id));
for (const p of SEED_POSITIONS) {
  if (!validateFen(p.fen).ok) fail(`posição ${p.id}`, 'FEN inválido');
}
for (const l of SEED_LESSONS) {
  if (!SEED_PROFESSORS.some((p) => p.id === l.professorId)) fail(`aula ${l.id}`, 'professor inexistente');
  if (l.practice && !validateFen(l.practice.fen).ok) fail(`aula ${l.id}`, 'posição de prática com FEN inválido');
}

if (errors.length) {
  console.error(`\n${errors.length} problema(s) no conteúdo:`);
  for (const e of errors) console.error(' - ' + e);
  process.exit(1);
}
console.log(
  `\nConteúdo ok: ${CHALLENGES.length} desafios, ${TEACH_MODULES.length} módulos de ensino, ${SEED_LESSONS.length} aulas, ${BOTS.length} bots.`,
);
