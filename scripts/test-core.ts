// Testes das regras de negócio (TypeScript puro, sem browser).
// Rode com: npm test
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Chess } from 'chess.js';
import { BOTS, getBot } from '../src/content/bots';
import { CHALLENGES, CHALLENGE_TIERS } from '../src/content/challenges';
import { ACHIEVEMENTS, CAREER_STAGES, LESSON_XP, levelStartXp, MAX_LEVEL } from '../src/content/progression';
import { buildCustomChallenge, dailyChallenge, evaluateAttempt, isTierUnlocked } from '../src/core/challenges';
import { applyStroke } from '../src/core/chess/annotations';
import { boardToFen, checkPosition, fenToBoard, parseFenInput } from '../src/core/chess/fen';
import { ChessGame } from '../src/core/chess/game';
import { materialInfo } from '../src/core/chess/material';
import { reconcilePieces } from '../src/core/chess/pieces';
import { NO_ANNOTATIONS, START_FEN } from '../src/core/chess/types';
import { chooseBotMove, MinimaxEngine, summarizeEval } from '../src/core/engine';
import {
  applyChallengeSolved,
  applyCheckGiven,
  applyGameResult,
  applyLessonCompleted,
  createInitialProgress,
  getCareerView,
  getLevelInfo,
} from '../src/core/progression';
import { decodeSharedPosition, encodeSharedPosition } from '../src/services/share';

let passed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (err) {
    console.error(`FALHOU  ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

const date = '2026-03-10T12:00:00.000Z';
const game = (botId: string, mode: 'treino' | 'carreira' | 'laboratorio', outcome: 'win' | 'loss' | 'draw', id = Math.random().toString()) =>
  ({ id, bot: getBot(botId), mode, outcome, reason: 'checkmate' as const, playerColor: 'w' as const, moveCount: 20, date });

async function main() {
  console.log('Xadrez');
  await test('FEN ida e volta', () => {
    const board = fenToBoard(START_FEN);
    assert.equal(Object.keys(board).length, 32);
    assert.equal(boardToFen(board, 'w'), START_FEN);
    assert.equal(parseFenInput('lixo'), null);
    assert.equal(parseFenInput('8/8/8/8/8/8/8/8')?.turn, 'w');
  });
  await test('validação de posição do editor', () => {
    assert.equal(checkPosition(fenToBoard(START_FEN), 'w').ok, true);
    assert.match(checkPosition({}, 'w').errors.join(' '), /rei branco/);
    assert.match(checkPosition({ e1: 'wK', e8: 'bK', a8: 'wP' }, 'w').errors.join(' '), /Peões/);
    // rei preto em xeque com as brancas para jogar: impossível
    assert.equal(checkPosition({ e1: 'wK', e8: 'bK', e2: 'wR' }, 'w').ok, false);
    assert.equal(checkPosition({ e1: 'wK', e8: 'bK', e2: 'wR' }, 'b').ok, true);
    // só os dois reis: partida já empatada
    assert.equal(checkPosition({ e1: 'wK', e8: 'bK' }, 'w').ok, false);
    assert.equal(checkPosition({ e1: 'wK', e8: 'bK' }, 'w', { allowFinished: true }).ok, true);
  });
  await test('partida: xeque, mate, afogamento, desistência, desfazer', () => {
    const g = new ChessGame();
    for (const m of ['f3', 'e5', 'g4']) assert.ok(g.move(m));
    assert.equal(g.move({ from: 'a7', to: 'a1' }), null, 'lance ilegal é recusado');
    const mate = g.move('Qh4#');
    assert.ok(mate?.isMate);
    const s = g.snapshot();
    assert.equal(s.status, 'checkmate');
    assert.equal(s.winner, 'b');
    assert.equal(s.checkSquare, 'e1');
    g.undo(1);
    assert.equal(g.snapshot().status, 'playing');
    g.resign('b');
    assert.equal(g.snapshot().winner, 'w');

    const stale = new ChessGame('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
    assert.equal(stale.snapshot().status, 'stalemate');
    assert.equal(stale.snapshot().winner, null);
    assert.equal(new ChessGame('8/8/8/4k3/8/8/8/4K3 w - - 0 1').snapshot().status, 'draw-material');
    assert.equal(ChessGame.fromMoves(START_FEN, ['e4', 'e5', 'Nf3']).snapshot().moves.length, 3);
  });
  await test('promoção e destinos legais', () => {
    const g = new ChessGame('8/5P1k/5K2/8/8/8/8/8 w - - 0 1');
    assert.equal(g.needsPromotion('f7', 'f8'), true);
    assert.ok(g.legalTargets('f7').some((t) => t.to === 'f8' && t.promotion));
    assert.equal(g.move({ from: 'f7', to: 'f8', promotion: 'r' })?.san, 'f8=R');
  });
  await test('material e animação de peças', () => {
    const g = new ChessGame();
    for (const m of ['e4', 'd5', 'exd5']) g.move(m);
    const info = materialInfo(g.snapshot().board);
    assert.deepEqual(info.lost.b, ['p']);
    assert.equal(info.balance, 1);
    let id = 0;
    const before = reconcilePieces([], fenToBoard(START_FEN), () => ++id);
    const moved = new ChessGame();
    moved.move('Nf3');
    const after = reconcilePieces(before, moved.snapshot().board, () => ++id);
    const knight = before.find((p) => p.square === 'g1')!;
    assert.equal(after.find((p) => p.id === knight.id)?.square, 'f3', 'a peça mantém a identidade ao mover');
    assert.equal(id, 32);
  });
  await test('marcações', () => {
    let a = applyStroke(NO_ANNOTATIONS, 'e4', 'e4', 'good');
    assert.equal(a.squares.length, 1);
    a = applyStroke(a, 'e4', 'e4', 'bad');
    assert.equal(a.squares[0].color, 'bad');
    a = applyStroke(a, 'e4', 'e4', 'bad');
    assert.equal(a.squares.length, 0);
    a = applyStroke(a, 'g1', 'f3', 'idea');
    assert.equal(a.arrows.length, 1);
  });

  console.log('Engine');
  await test('engine de reserva acha mate em 1 e joga lances legais', async () => {
    const engine = new MinimaxEngine();
    const r = await engine.search('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', { depth: 2, skillLevel: 20 });
    assert.equal(r.bestMove, 'e1e8');
    assert.ok(r.lines[0].mateIn && r.lines[0].mateIn > 0);
    assert.match(summarizeEval(r.lines[0])!.text, /Brancas dão mate/);
  });
  await test('todo bot termina uma partida jogando só lances legais', async () => {
    const engine = new MinimaxEngine();
    for (const bot of BOTS) {
      const g = new ChessGame();
      let plies = 0;
      while (g.status() === 'playing' && plies < 60) {
        const uci = await chooseBotMove(engine, g.fen, { ...bot.engine, depth: Math.min(bot.engine.depth, 2), moveTimeMs: 50 });
        assert.ok(uci, 'bot devolveu um lance');
        assert.ok(g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: (uci[4] as 'q') || undefined }), `lance legal de ${bot.id}`);
        plies++;
      }
      assert.ok(plies > 0);
    }
  });
  await test('bot com descuido não recusa mate em 1', async () => {
    const engine = new MinimaxEngine();
    const cfg = { ...getBot('tio-guilherme').engine, blunderChance: 1 };
    const uci = await chooseBotMove(engine, '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', cfg, () => 0);
    assert.equal(uci, 'e1e8');
  });

  console.log('Progressão');
  await test('níveis vão de 1 a 100', () => {
    assert.equal(getLevelInfo(0).level, 1);
    assert.equal(getLevelInfo(levelStartXp(2) - 1).level, 1);
    assert.equal(getLevelInfo(levelStartXp(2)).level, 2);
    assert.equal(getLevelInfo(levelStartXp(37)).level, 37);
    for (let n = 2; n <= MAX_LEVEL; n++) assert.ok(levelStartXp(n) > levelStartXp(n - 1), 'cada nível custa mais XP');
    assert.equal(getLevelInfo(levelStartXp(MAX_LEVEL)).level, MAX_LEVEL);
    const beyond = getLevelInfo(levelStartXp(MAX_LEVEL) * 10);
    assert.equal(beyond.level, MAX_LEVEL, 'não passa do 100');
    assert.equal(beyond.progress, 1);
    const half = getLevelInfo((levelStartXp(2) + levelStartXp(3)) / 2);
    assert.equal(half.level, 2);
    assert.equal(half.progress, 0.5);
  });
  await test('partida contra bot dá sequência e conquista, mas não XP', () => {
    let p = createInitialProgress();
    const win = applyGameResult(p, game('tio-guilherme', 'carreira', 'win'));
    p = win.progress;
    assert.equal(win.reward.xpGained, 0, 'XP vem só de desafios e aulas');
    assert.equal(p.xp, 0);
    assert.deepEqual(win.reward.newAchievements, ['primeira-vitoria']);
    assert.equal(p.stats.currentStreak, 1);
    const loss = applyGameResult(p, game('tio-joao', 'carreira', 'loss'));
    assert.equal(loss.progress.stats.currentStreak, 0);
    assert.equal(loss.progress.stats.bestStreak, 1);
  });
  await test('posição montada não conta para estatísticas', () => {
    const r = applyGameResult(createInitialProgress(), game('tio-marcao', 'laboratorio', 'win'));
    assert.equal(r.progress.stats.games, 0);
    assert.equal(r.reward.xpGained, 0);
    assert.equal(r.progress.history.length, 1);
    assert.deepEqual(r.reward.newAchievements, []);
  });
  await test('carreira avança de etapa e termina', () => {
    let p = createInitialProgress();
    let cleared = 0;
    for (const stage of CAREER_STAGES) {
      for (let i = 0; i < stage.winsToAdvance; i++) {
        // vitória no treino não avança a carreira
        p = applyGameResult(p, game(stage.botId, 'treino', 'win')).progress;
        const before = p.career;
        const r = applyGameResult(p, game(stage.botId, 'carreira', 'win'));
        p = r.progress;
        if (r.reward.careerStageCleared) cleared++;
        assert.notDeepEqual(p.career, before);
      }
    }
    assert.equal(cleared, CAREER_STAGES.length);
    assert.equal(p.career.completed, true);
    assert.equal(getCareerView(p).current, null);
    assert.equal(p.xp, 0);
    assert.ok(p.achievements['campeao-carreira']);
    assert.ok(p.achievements['sequencia-5']);
  });
  await test('xeque, aulas e desafios', () => {
    let p = createInitialProgress();
    const c = applyCheckGiven(p, date);
    assert.deepEqual(c.reward.newAchievements, ['primeiro-xeque']);
    p = c.progress;
    const l1 = applyLessonCompleted(p, 'a', date);
    assert.equal(l1.reward.xpGained, LESSON_XP);
    assert.equal(applyLessonCompleted(l1.progress, 'a', date).reward.xpGained, 0, 'aula repetida não dá XP de novo');
    const s1 = applyChallengeSolved(p, { id: 'x', xp: 15 }, { date, isDaily: true });
    assert.equal(s1.reward.xpGained, 35, 'XP do desafio + bônus diário');
    assert.ok(getLevelInfo(s1.progress.xp + l1.progress.xp).level >= 2, 'estudo sobe de nível');
    const s2 = applyChallengeSolved(s1.progress, { id: 'x', xp: 15 }, { date, isDaily: true });
    assert.equal(s2.reward.xpGained, 0);
  });
  await test('toda conquista tem meta atingível', () => {
    const p = createInitialProgress();
    for (const a of ACHIEVEMENTS) {
      const m = a.measure(p);
      assert.ok(m.target > 0 && m.current < m.target, a.id);
    }
  });

  console.log('Desafios');
  await test('acerto, erro e solução alternativa', () => {
    const corredor = CHALLENGES.find((c) => c.id === 'corredor')!;
    assert.equal(evaluateAttempt(corredor, corredor.fen, [], { from: 'e1', to: 'e7' }).correct, false);
    const ok = evaluateAttempt(corredor, corredor.fen, [], { from: 'e1', to: 'e8' });
    assert.ok(ok.correct && ok.solved);

    const escada = CHALLENGES.find((c) => c.id === 'escada')!;
    const alt = evaluateAttempt(escada, escada.fen, [], { from: 'b1', to: 'b7' });
    assert.ok(alt.correct && !alt.solved && alt.reply, 'Rb7 também resolve');
    const chess = new Chess(escada.fen);
    chess.move('Rb7');
    chess.move(alt.reply!);
    assert.ok(evaluateAttempt(escada, chess.fen(), ['Rb7', alt.reply!], { from: 'a2', to: 'a8' }).solved);
    assert.equal(evaluateAttempt(escada, escada.fen, [], { from: 'a2', to: 'a8' }).correct, false, 'xeque apressado não resolve');

    const promo = CHALLENGES.find((c) => c.id === 'nem-sempre-dama')!;
    assert.equal(evaluateAttempt(promo, promo.fen, [], { from: 'f7', to: 'f8', promotion: 'q' }).correct, false, 'dama afoga');
    assert.equal(evaluateAttempt(promo, promo.fen, [], { from: 'f7', to: 'f8', promotion: 'r' }).correct, true);

    const garfo = CHALLENGES.find((c) => c.id === 'garfo-real')!;
    const g1 = evaluateAttempt(garfo, garfo.fen, [], { from: 'd5', to: 'c7' });
    assert.ok(g1.correct && g1.reply === 'Kd7');
  });
  await test('toda solução oficial resolve o próprio desafio', () => {
    for (const c of CHALLENGES) {
      const chess = new Chess(c.fen);
      const played: string[] = [];
      let solved = false;
      for (let i = 0; i < c.solution.length; i += 2) {
        const m = new Chess(chess.fen()).move(c.solution[i]);
        const r = evaluateAttempt(c, chess.fen(), played, { from: m.from, to: m.to, promotion: m.promotion as 'q' });
        assert.ok(r.correct, `${c.id}: ${c.solution[i]}`);
        chess.move(c.solution[i]);
        played.push(r.san!);
        if (r.solved) solved = true;
        else {
          chess.move(r.reply!);
          played.push(r.reply!);
        }
      }
      assert.ok(solved, c.id);
    }
  });
  await test('grupos destravam em ordem; desafio diário é estável', () => {
    const none = {};
    assert.equal(isTierUnlocked(CHALLENGE_TIERS[0], CHALLENGE_TIERS, CHALLENGES, none), true);
    assert.equal(isTierUnlocked(CHALLENGE_TIERS[1], CHALLENGE_TIERS, CHALLENGES, none), false);
    const three = Object.fromEntries(CHALLENGES.filter((c) => c.tier === 1).slice(0, 3).map((c) => [c.id, date]));
    assert.equal(isTierUnlocked(CHALLENGE_TIERS[1], CHALLENGE_TIERS, CHALLENGES, three), true);
    assert.equal(dailyChallenge(CHALLENGES, date)?.id, dailyChallenge(CHALLENGES, '2026-03-10T23:59:00.000Z')?.id);
  });
  await test('desafio criado no Laboratório', () => {
    const built = buildCustomChallenge(
      { title: 'Teste', prompt: '', fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', solution: ['Re8#'], authorName: 'Prof' },
      'c1',
    );
    assert.ok(!('error' in built));
    if (!('error' in built)) {
      assert.equal(built.type, 'mate-1');
      assert.equal(built.mateIn, 1);
      assert.match(built.prompt, /Mate em 1/);
    }
    assert.ok('error' in buildCustomChallenge({ title: '', prompt: '', fen: START_FEN, solution: [], authorName: '' }, 'c2'));
  });

  console.log('Serviços');
  await test('link de posição compartilhada', () => {
    const original = {
      name: 'Garfo — aula de terça',
      description: 'Ache a casa',
      fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
      annotations: { squares: [{ square: 'c7', color: 'good' as const }], arrows: [{ from: 'd5', to: 'c7', color: 'idea' as const }] },
    };
    const code = encodeSharedPosition(original);
    assert.match(code, /^[\w-]+$/);
    assert.deepEqual(decodeSharedPosition(code), original);
    assert.equal(decodeSharedPosition('%%%'), null);
  });

  // Os mesmos testes rodam duas vezes: com o banco em arquivo (servidor Node)
  // e com o D1Store sobre um D1 simulado (o caminho usado na Cloudflare).
  process.env.LIGAX_DATA_DIR = mkdtempSync(join(tmpdir(), 'ligax-test-'));
  const storeMod = await import('../src/server/store');
  const auth = await import('../src/server/auth');
  const matches = await import('../src/server/matches');
  const content = await import('../src/server/content');
  const { ONLINE_SCORE } = await import('../src/content/progression');
  const fails = (fn: () => Promise<unknown>, status: number) =>
    assert.rejects(fn, (e: unknown) => e instanceof auth.HttpError && e.status === status);

  /** D1 de mentira: entende só os quatro comandos que o D1Store usa. */
  function fakeD1() {
    const rows = new Map<string, string>();
    const key = (col: unknown, id: unknown) => `${col}\u0000${id}`;
    return {
      rows,
      prepare(sql: string) {
        let args: unknown[] = [];
        const stmt = {
          bind(...values: unknown[]) {
            args = values;
            return stmt;
          },
          async first<T>() {
            const data = rows.get(key(args[0], args[1]));
            return (data === undefined ? null : { data }) as T | null;
          },
          async all<T>() {
            const prefix = `${args[0]}\u0000`;
            return { results: [...rows].filter(([k]) => k.startsWith(prefix)).map(([, data]) => ({ data })) as T[] };
          },
          async run() {
            if (sql.startsWith('INSERT')) rows.set(key(args[0], args[1]), String(args[2]));
            else if (sql.startsWith('DELETE')) rows.delete(key(args[0], args[1]));
            else if (!sql.startsWith('CREATE TABLE')) throw new Error('SQL inesperado: ' + sql);
          },
        };
        return stmt;
      },
    };
  }

  for (const backend of ['arquivo', 'D1 simulado'] as const) {
    console.log(`Servidor (${backend})`);
    let d1: ReturnType<typeof fakeD1> | null = null;
    if (backend === 'arquivo') {
      storeMod.useStoreForTests(null);
    } else {
      d1 = fakeD1();
      const store = new storeMod.D1Store(d1);
      await storeMod.seed(store);
      storeMod.useStoreForTests(store);
    }
    const store = await storeMod.getStore();
    const user = (id: string) => store.get<import('../src/server/types').UserRow>('users', id);

    await test('cadastro: e-mail, senha e nick validados; primeira conta é admin', async () => {
      await fails(() => auth.registerUser({ email: 'sem-arroba', password: '12345678', nick: 'ana' }), 400);
      await fails(() => auth.registerUser({ email: 'a@a.com', password: 'curta', nick: 'ana' }), 400);
      await fails(() => auth.registerUser({ email: 'a@a.com', password: '12345678', nick: 'x' }), 400);
      const ana = await auth.registerUser({ email: 'Ana@Liga.com', password: 'segredo123', nick: 'Ana' });
      assert.equal(ana.role, 'admin');
      assert.equal(ana.email, 'ana@liga.com');
      assert.ok(!ana.passwordHash.includes('segredo123'), 'senha nunca é guardada em texto');
      assert.match(ana.passwordHash, /^pbkdf2\$/);
      const bia = await auth.registerUser({ email: 'bia@liga.com', password: 'segredo123', nick: 'Bia' });
      assert.equal(bia.role, 'aluno');
      await fails(() => auth.registerUser({ email: 'ana@liga.com', password: 'segredo123', nick: 'Outra' }), 409);
      await fails(() => auth.registerUser({ email: 'c@liga.com', password: 'segredo123', nick: 'ANA' }), 409);
      assert.equal(auth.toPublicUser(ana).score, 0);
      assert.ok(!('passwordHash' in auth.toPublicUser(ana)));
    });
    await test('login confere a senha, troca de senha funciona, tentativas são freadas', async () => {
      const ana = await auth.loginUser({ email: 'ana@liga.com', password: 'segredo123' });
      assert.equal(ana.name, 'Ana');
      await fails(() => auth.loginUser({ email: 'ana@liga.com', password: 'errada' }), 401);
      await fails(() => auth.loginUser({ email: 'ninguem@liga.com', password: 'segredo123' }), 401);
      await fails(() => auth.changePassword(ana, 'errada', 'novasenha123'), 401);
      await auth.changePassword(ana, 'segredo123', 'novasenha123');
      await auth.loginUser({ email: 'ana@liga.com', password: 'novasenha123' });
      await fails(() => auth.loginUser({ email: 'ana@liga.com', password: 'segredo123' }), 401);
      // e-mail próprio de cada rodada: o freio de tentativas fica na memória do processo
      const victim = `freio-${backend === 'arquivo' ? 'a' : 'b'}@liga.com`;
      await auth.registerUser({ email: victim, password: 'segredo123', nick: `Freio${backend === 'arquivo' ? 'A' : 'B'}` });
      for (let i = 0; i < 8; i++) await fails(() => auth.loginUser({ email: victim, password: 'errada' }), 401);
      await fails(() => auth.loginUser({ email: victim, password: 'segredo123' }), 429);
    });
    await test('partida online: convite, vez, lances válidos e Score', async () => {
      const all = await store.list<import('../src/server/types').UserRow>('users');
      const ana = all.find((u) => u.name === 'Ana')!;
      const bia = all.find((u) => u.name === 'Bia')!;
      const caio = await auth.registerUser({ email: 'caio@liga.com', password: 'segredo123', nick: 'Caio' });
      const m = await matches.createMatch(ana, 'w');
      assert.match(m.id, /^[A-Z2-9]{6}$/);
      await fails(() => matches.playMove(m.id, ana, { from: 'e2', to: 'e4' }), 409); // amigo ainda não entrou
      await matches.joinMatch(m.id.toLowerCase(), bia);
      assert.equal((await matches.toView(await matches.getMatch(m.id))).black?.name, 'Bia');
      await fails(() => matches.joinMatch(m.id, caio), 409); // partida cheia
      await fails(() => matches.playMove(m.id, caio, { from: 'e2', to: 'e4' }), 403); // não está na partida
      await fails(() => matches.playMove(m.id, bia, { from: 'e7', to: 'e5' }), 409); // não é a vez
      await fails(() => matches.playMove(m.id, ana, { from: 'e2', to: 'e5' }), 400); // lance ilegal
      // Mate do Pastor
      const line: [typeof ana, string, string][] = [
        [ana, 'e2', 'e4'], [bia, 'e7', 'e5'], [ana, 'd1', 'h5'], [bia, 'b8', 'c6'], [ana, 'f1', 'c4'], [bia, 'g8', 'f6'], [ana, 'h5', 'f7'],
      ];
      for (const [who, from, to] of line) await matches.playMove(m.id, who, { from, to });
      const view = await matches.toView(await matches.getMatch(m.id));
      assert.equal(view.status, 'finished');
      assert.equal(view.winner, 'w');
      assert.equal(view.reason, 'checkmate');
      assert.equal(view.version, 9, 'versão cresce a cada mudança');
      assert.equal((await user(ana.id))!.score, ONLINE_SCORE.win);
      assert.equal((await user(bia.id))!.score, ONLINE_SCORE.loss);
      assert.deepEqual((await user(ana.id))!.online, { wins: 1, losses: 0, draws: 0 });
      await fails(() => matches.playMove(m.id, bia, { from: 'e8', to: 'f7' }), 409); // já terminou
      assert.equal((await matches.listMatches(ana.id)).length, 1);

      // desistir logo de cara não rende Score para ninguém
      const quick = await matches.createMatch(bia, 'w');
      await matches.joinMatch(quick.id, caio);
      await matches.resignMatch(quick.id, bia);
      assert.equal((await matches.getMatch(quick.id)).winner, 'b');
      assert.equal((await user(caio.id))!.score, 0);

      // convite cancelado some
      const invite = await matches.createMatch(caio, 'r');
      await matches.resignMatch(invite.id, caio);
      await fails(() => matches.getMatch(invite.id), 404);
    });
    await test('aula só é publicada com vídeo; aluno não vê rascunho', async () => {
      const base = { title: 'Abertura', professorId: 'tio-guilherme', number: 1, minutes: 5, keyPoints: [] };
      await fails(() => content.saveLesson({ ...base, published: true }), 400);
      const draft = await content.saveLesson({ ...base, published: false });
      assert.equal(draft.published, false);
      const live = await content.saveLesson({ ...base, id: draft.id, published: true, video: { kind: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' } });
      assert.equal(live.published, true);
      const student = await content.listContent(false);
      const staff = await content.listContent(true);
      assert.ok(student.lessons.some((l) => l.id === live.id), 'aluno vê a aula publicada');
      assert.ok(student.lessons.every((l) => l.published && l.video), 'aluno nunca vê rascunho');
      assert.equal(staff.professors.length, 4, 'conteúdo inicial gravado uma vez só');
      assert.ok(staff.lessons.length > student.lessons.length, 'professor vê os rascunhos');
      await fails(() => content.removeProfessor('tio-guilherme'), 400);
      await content.removeLesson(live.id);
      assert.ok(!(await content.listContent(true)).lessons.some((l) => l.id === live.id));
    });
    if (d1) {
      await test('no D1, tudo vira linhas na tabela de documentos', () => {
        const cols = new Set([...d1!.rows.keys()].map((k) => k.split('\u0000')[0]));
        for (const c of ['users', 'professors', 'lessons', 'matches', 'meta']) assert.ok(cols.has(c), c);
        assert.ok(storeMod.D1Store.name === 'D1Store');
      });
    }
  }
  storeMod.useStoreForTests(null);

  console.log(process.exitCode ? '\nHá testes falhando.' : `\n${passed} testes passaram.`);
}

void main();
