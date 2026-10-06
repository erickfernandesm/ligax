// Partidas de verdade contra os bots: seleção, aleatório, derrota, empate,
// vitória por mate (carreira, com XP e conquista), retomar partida.
import { Chess } from 'chess.js';
import { BASE, launch, move, openPage, readBoard, report, shot, signIn, tapSquare } from './helpers.mjs';

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`  ${cond ? 'ok ' : 'FALHOU'} ${msg}`);
};

/** Melhor lance segundo um Stockfish à parte, rodando na própria página. */
async function bestMove(page, fen, depth = 10) {
  return page.evaluate(
    ({ fen, depth }) =>
      new Promise((resolve) => {
        const w = (window.__sf ??= new Worker('/engine/stockfish-19-lite-single.js'));
        const onMsg = (e) => {
          if (typeof e.data === 'string' && e.data.startsWith('bestmove')) {
            w.removeEventListener('message', onMsg);
            resolve(e.data.split(' ')[1]);
          }
        };
        w.addEventListener('message', onMsg);
        w.postMessage('setoption name Skill Level value 20');
        w.postMessage(`position fen ${fen}`);
        w.postMessage(`go depth ${depth}`);
      }),
    { fen, depth },
  );
}

const placement = (chess) => {
  const out = {};
  for (const row of chess.board()) for (const p of row) if (p) out[p.square] = p.color + p.type.toUpperCase();
  return JSON.stringify(Object.entries(out).sort());
};
const domPlacement = async (page) => JSON.stringify(Object.entries((await readBoard(page)).board).sort());

/** Espera o bot jogar e descobre qual foi o lance comparando com o tabuleiro na tela. */
async function syncBotMove(page, chess) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(250);
    const dom = await domPlacement(page);
    for (const m of chess.moves({ verbose: true })) {
      chess.move(m);
      const same = placement(chess) === dom;
      if (same) return m;
      chess.undo();
    }
  }
  throw new Error('o bot não jogou em 30s');
}

const PROMO = { q: 'Dama', r: 'Torre', b: 'Bispo', n: 'Cavalo' };

async function playMove(page, uci) {
  await move(page, uci.slice(0, 2), uci.slice(2, 4));
  if (uci[4]) await page.getByRole('dialog').getByRole('button', { name: PROMO[uci[4]] }).click();
}

const browser = await launch();
const { page, problems } = await openPage(browser, { width: 390, height: 844 });
await signIn(page, `Jogo${Date.now() % 100000}`);

// ───────── seleção de adversário + partida aleatória ─────────
console.log('Seleção de adversário');
await page.goto(BASE + '/jogar');
await page.getByRole('button', { name: 'Jogar contra Tio Guilherme' }).waitFor();
for (const name of ['Tio Guilherme', 'Tio João', 'Tio Renan', 'Tio Marcão']) {
  check(await page.getByRole('button', { name: `Jogar contra ${name}` }).isVisible(), `card do ${name} com botão Jogar`);
}
await page.getByRole('button', { name: /Partida aleatória/ }).click();
const randomTitle = await page.getByRole('dialog').getByRole('heading').textContent();
check(/^Saiu o Tio /.test(randomTitle ?? ''), `aleatório sorteia um bot ("${randomTitle}")`);
await page.getByRole('button', { name: 'Fechar' }).click();

// ───────── treino: lances, destinos, lance ilegal, voltar, retomar, desistir ─────────
console.log('Treino contra o Tio Guilherme');
await page.getByRole('button', { name: 'Jogar contra Tio Guilherme' }).click();
await page.getByRole('radio', { name: 'Brancas' }).click();
await page.getByRole('button', { name: 'Começar partida' }).click();
await page.waitForURL(/\/partida/);
await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();

await tapSquare(page, 'e2');
const dots = await page.locator('[data-board] [data-square] span.rounded-full').count();
check(dots === 2, `peão selecionado mostra 2 destinos (viu ${dots})`);
await tapSquare(page, 'e5'); // destino ilegal: nada acontece
check((await readBoard(page)).board.e2 === 'wP', 'lance ilegal é ignorado');
const chess = new Chess();
await playMove(page, 'e2e4');
chess.move('e4');
check((await readBoard(page)).board.e4 === 'wP', 'peão foi para e4');
await page.getByText('está pensando').waitFor({ timeout: 5000 }).catch(() => {});
const reply = await syncBotMove(page, chess);
check(!!reply, `bot respondeu ${reply.san}`);
await page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor();
await shot(page, 'jogo-em-andamento');

await page.getByRole('button', { name: 'Voltar lance' }).click();
check((await readBoard(page)).board.e2 === 'wP', '"Voltar lance" desfaz o lance e a resposta');
chess.undo();
chess.undo();

// retomar partida pela home
await playMove(page, 'd2d4');
chess.move('d4');
await syncBotMove(page, chess);
await page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor();
await page.goto(BASE + '/');
await page.getByRole('link', { name: /Partida em andamento/ }).click();
await page.waitForURL(/continuar=1/);
await page.locator('[data-board]').waitFor();
check((await readBoard(page)).board.d4 === 'wP', 'partida retomada na mesma posição');

await page.getByRole('button', { name: 'Desistir' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
await page.getByRole('heading', { name: 'Derrota' }).waitFor();
check(await page.getByText('Desistência').isVisible(), 'desistir termina em derrota');
await shot(page, 'resultado-derrota');
await page.getByRole('button', { name: 'Ver o tabuleiro' }).click();
check(await page.getByRole('button', { name: 'Novo jogo' }).isVisible(), 'depois do fim aparece "Novo jogo"');
await page.getByRole('button', { name: 'Novo jogo' }).click();
check((await readBoard(page)).board.d2 === 'wP', '"Novo jogo" volta à posição inicial');

// ───────── posições montadas: mate do bot, empate, vitória sem XP ─────────
console.log('Fins de jogo a partir de posições');
const lab = (fen, bot, cor) => `${BASE}/partida?bot=${bot}&modo=laboratorio&cor=${cor}&fen=${encodeURIComponent(fen)}`;

await page.goto(lab('r5k1/8/8/8/8/8/5PPP/6K1 b - - 0 1', 'tio-marcao', 'w'));
await page.getByRole('heading', { name: 'Derrota' }).waitFor({ timeout: 20000 });
check(await page.getByText('Xeque-mate', { exact: true }).isVisible(), 'bot dá xeque-mate → derrota');
await page.getByRole('button', { name: 'Ver o tabuleiro' }).click();
const mated = await page.locator('[data-board] [data-square="g1"] span[class*="radial-gradient"]').count();
check(mated > 0, 'rei em xeque fica destacado');

await page.goto(lab('7k/8/5QK1/8/8/8/8/8 w - - 0 1', 'tio-joao', 'w'));
await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
await playMove(page, 'f6f7');
await page.getByRole('heading', { name: 'Empate' }).waitFor();
check(await page.getByText('Empate por afogamento').isVisible(), 'afogamento → empate');
await shot(page, 'resultado-empate');

await page.goto(lab('8/5P1k/5K2/8/8/8/8/8 w - - 0 1', 'tio-guilherme', 'w'));
await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
await playMove(page, 'f7f8r');
check((await readBoard(page)).board.f8 === 'wR', 'promoção para torre');

await page.goto(lab('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1', 'tio-renan', 'w'));
await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
await playMove(page, 'e1e8');
await page.getByRole('heading', { name: 'Vitória!' }).waitFor();
check(await page.getByText('não conta para a carreira').isVisible(), 'posição montada não conta para a carreira');

// jogando de pretas: o bot abre a partida
await page.goto(`${BASE}/partida?bot=tio-joao&modo=treino&cor=b`);
await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor({ timeout: 20000 });
check((await domPlacement(page)) !== placement(new Chess()), 'de pretas, o bot faz o primeiro lance');

// ───────── carreira: partida completa até o mate ─────────
console.log('Carreira: partida completa contra o Tio Guilherme');
await page.goto(BASE + '/carreira');
await page.getByRole('button', { name: 'Jogar', exact: true }).click();
await page.getByRole('button', { name: 'Começar partida' }).click();
await page.waitForURL(/modo=carreira/);
await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
const career = new Chess();
let plies = 0;
let sawCheckHighlight = false;
while (!career.isGameOver() && plies < 160) {
  const uci = await bestMove(page, career.fen());
  career.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  await playMove(page, uci);
  plies++;
  if (career.isGameOver()) break;
  await syncBotMove(page, career);
  if (career.isGameOver()) break;
  await page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor({ timeout: 20000 });
  if (career.inCheck() && !sawCheckHighlight) {
    sawCheckHighlight = (await page.getByRole('status').filter({ hasText: 'Xeque! Sua vez' }).count()) > 0;
  }
}
check(career.isCheckmate() && career.turn() === 'b', `vitória por xeque-mate em ${plies} lances`);
await page.getByRole('heading', { name: 'Vitória!' }).waitFor();
await page.waitForTimeout(1200);
await shot(page, 'resultado-vitoria');
const dialog = page.getByRole('dialog');
check((await dialog.getByText(/XP/).count()) === 0, 'partida contra bot não dá XP');
check(await dialog.getByText('Primeira Vitória').isVisible(), 'conquista "Primeira Vitória" desbloqueada');
await dialog.getByRole('link', { name: 'Continuar carreira' }).click();
await page.waitForURL(/\/carreira$/);
check(await page.getByText('1/2 vitórias').isVisible(), 'carreira registra 1/2 vitórias na etapa');

await page.goto(BASE + '/perfil');
await shot(page, 'perfil-depois');
const profile = await page.locator('main').innerText();
check(/Tio Guilherme/.test(profile) && /Vitória/.test(profile), 'histórico recente mostra a vitória');
check(/0 \/ 42 XP/.test(profile), 'nível não muda com partida contra bot');

await browser.close();
report('partidas', [...failures, ...problems]);
