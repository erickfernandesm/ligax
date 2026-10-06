// Contas e jogo online: cadastro, login, erros, duas contas jogando uma
// partida inteira, Score e ranking.
import { BASE, freshEmail, launch, logIn, move, openPage, PASSWORD, readBoard, report, shot, signIn, unexpected } from './helpers.mjs';

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`  ${cond ? 'ok ' : 'FALHOU'} ${msg}`);
};
const tag = Date.now() % 100000;
const waitText = (page, re, timeout = 10000) =>
  page.waitForFunction((src) => new RegExp(src, 'i').test(document.body.innerText), re.source, { timeout });

const browser = await launch();
const a = await openPage(browser, { width: 390, height: 844 });
const b = await openPage(browser, { width: 390, height: 844 });

// ───────── contas ─────────
console.log('Contas');
const emailA = freshEmail('ana');
await a.page.goto(BASE + '/');
await a.page.getByRole('heading', { name: 'Entre na sua conta' }).waitFor();
await shot(a.page, 'login');
await a.page.getByRole('tab', { name: 'Criar conta' }).click();
await a.page.getByLabel('Nick').fill(`Ana${tag}`);
await a.page.getByLabel('E-mail').fill(emailA);
await a.page.getByLabel('Senha', { exact: true }).fill('curta');
await a.page.getByRole('button', { name: 'Criar conta e entrar' }).click();
await waitText(a.page, /pelo menos 8 caracteres/);
check(true, 'senha curta é recusada com explicação');
await a.page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
await a.page.getByRole('button', { name: 'Criar conta e entrar' }).click();
await a.page.getByRole('heading', { name: 'Bora jogar?' }).waitFor();
check(true, 'conta criada com e-mail, senha e nick');

// segunda conta: e-mail e nick repetidos são recusados
await b.page.goto(BASE + '/');
await b.page.getByRole('tab', { name: 'Criar conta' }).click();
await b.page.getByLabel('Nick').fill(`Bia${tag}`);
await b.page.getByLabel('E-mail').fill(emailA);
await b.page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
await b.page.getByRole('button', { name: 'Criar conta e entrar' }).click();
await waitText(b.page, /Já existe uma conta com esse e-mail/);
check(true, 'e-mail repetido é recusado');
const emailB = freshEmail('bia');
await b.page.getByLabel('E-mail').fill(emailB);
await b.page.getByLabel('Nick').fill(`ana${tag}`);
await b.page.getByRole('button', { name: 'Criar conta e entrar' }).click();
await waitText(b.page, /nick já está em uso/);
check(true, 'nick repetido é recusado');
await b.page.getByLabel('Nick').fill(`Bia${tag}`);
await b.page.getByRole('button', { name: 'Criar conta e entrar' }).click();
await b.page.getByRole('heading', { name: 'Bora jogar?' }).waitFor();

// sair e entrar de novo; senha errada
await b.page.goto(BASE + '/perfil');
await b.page.getByRole('button', { name: 'Sair da conta' }).click();
await b.page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
await b.page.getByRole('heading', { name: 'Entre na sua conta' }).waitFor();
await logIn(b.page, emailB, 'senha-errada-000');
await waitText(b.page, /E-mail ou senha incorretos/);
check(true, 'senha errada não entra');
await b.page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
await b.page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
await b.page.getByRole('heading', { name: 'Bora jogar?' }).waitFor();
check(true, 'login com e-mail e senha');

// ───────── partida online ─────────
console.log('Partida entre amigos');
await a.page.goto(BASE + '/amigo');
await a.page.getByRole('radio', { name: 'Brancas' }).click();
await a.page.getByRole('button', { name: 'Criar e convidar' }).click();
await a.page.waitForURL(/\/amigo\/[A-Z0-9]{6}$/);
const code = a.page.url().split('/').pop();
await waitText(a.page, /Esperando seu amigo entrar/);
check(/^[A-Z2-9]{6}$/.test(code), `convite criado (código ${code})`);
await shot(a.page, 'amigo-convite');

await b.page.goto(BASE + '/amigo');
await b.page.getByLabel('Código da partida').fill(code.toLowerCase());
await b.page.getByRole('button', { name: 'Entrar', exact: true }).click();
await b.page.waitForURL(new RegExp(`/amigo/${code}$`));
await b.page.getByRole('status').filter({ hasText: 'Vez do adversário' }).waitFor();
await a.page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
check(/Contra Bia/i.test(await a.page.locator('h1').innerText()), 'quem criou vê o amigo entrar');
check((await readBoard(b.page)).board.e1 === 'wK', 'as duas telas mostram a mesma posição');
const bRect = await b.page.evaluate(() => {
  const k = [...document.querySelectorAll('[data-board] img')].find((i) => i.src.includes('bK')).getBoundingClientRect();
  const board = document.querySelector('[data-board]').getBoundingClientRect();
  return k.top > board.top + board.height / 2;
});
check(bRect, 'quem joga de pretas vê as pretas embaixo');

// Mate do Pastor: Ana (brancas) vence
const turn = async (who, other, from, to) => {
  await who.page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor();
  await move(who.page, from, to);
  await other.page.waitForFunction(
    ({ sq }) => !!document.querySelector(`[data-board] [data-square="${sq}"] span.bg-lime\\/45`),
    { sq: to },
    { timeout: 8000 },
  );
};
await turn(a, b, 'e2', 'e4');
check((await readBoard(b.page)).board.e4 === 'wP', 'o lance chega na tela do amigo');
await b.page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
// fora da vez não joga
await move(a.page, 'd2', 'd4');
check((await readBoard(a.page)).board.d2 === 'wP', 'não dá pra jogar fora da vez');
await turn(b, a, 'e7', 'e5');
await turn(a, b, 'd1', 'h5');
await turn(b, a, 'b8', 'c6');
await turn(a, b, 'f1', 'c4');
await shot(b.page, 'amigo-partida');
await turn(b, a, 'g8', 'f6');
await a.page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor();
await move(a.page, 'h5', 'f7');
await a.page.getByRole('heading', { name: 'Vitória!' }).waitFor();
await b.page.getByRole('heading', { name: 'Derrota' }).waitFor();
check(true, 'xeque-mate: vitória para um, derrota para o outro');
await waitText(a.page, /Seu Score agora: 25/);
check(/\+25/.test(await a.page.getByRole('dialog').innerText()), 'vitória online vale +25 de Score');
check(/Seu Score agora: 0/.test(await b.page.getByRole('dialog').innerText()), 'derrota não tira pontos');
await shot(a.page, 'amigo-resultado');

await a.page.goto(BASE + '/amigo');
await waitText(a.page, /Ranking/);
await a.page.waitForFunction((n) => document.querySelector('ol')?.innerText.includes(n), `Ana${tag}`);
check(true, 'vencedor aparece no ranking');
await shot(a.page, 'amigo-lobby');
await a.page.goto(BASE + '/perfil');
await waitText(a.page, /Online/);
check(/25\s*\n?\s*Score/i.test(await a.page.locator('main').innerText()), 'Score aparece no perfil');
check(/0 \/ 42 XP/.test(await a.page.locator('main').innerText()), 'Score é separado do nível (XP não mudou)');

// desistência
await a.page.goto(BASE + '/amigo');
await a.page.getByRole('button', { name: 'Criar e convidar' }).click();
await a.page.waitForURL(/\/amigo\/[A-Z0-9]{6}$/);
const code2 = a.page.url().split('/').pop();
await b.page.goto(`${BASE}/amigo/${code2}`); // entrar direto pelo link do convite
await b.page.getByRole('status').filter({ hasText: /Sua vez|Vez do adversário/ }).waitFor();
check(true, 'abrir o link do convite já entra na partida');
await b.page.getByRole('button', { name: 'Desistir' }).click();
await b.page.getByRole('dialog').getByRole('button', { name: 'Desistir' }).click();
await b.page.getByRole('heading', { name: 'Derrota' }).waitFor();
await a.page.getByRole('heading', { name: 'Vitória!' }).waitFor();
await waitText(a.page, /Partida curta demais: não valeu Score/);
check(true, 'desistência imediata encerra a partida sem render Score');

// terceira pessoa não entra em partida cheia
const c = await openPage(browser, { width: 390, height: 844 });
await signIn(c.page, `Caio${tag}`);
await c.page.goto(`${BASE}/amigo/${code}`);
await waitText(c.page, /já tem dois jogadores/);
check(true, 'partida cheia recusa um terceiro jogador');
await c.page.goto(`${BASE}/amigo/ZZZZZZ`);
await waitText(c.page, /Partida não encontrada/);
check(true, 'código inexistente mostra erro claro');

await browser.close();
report('contas e jogo online', [...failures, ...unexpected([...a.problems, ...b.problems, ...c.problems])]);
