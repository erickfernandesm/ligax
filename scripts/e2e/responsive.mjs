// Garantia de responsividade. Em cada tamanho de tela, percorre todas as
// rotas E os estados abertos (folhas, diálogos, formulários) e reprova se:
//  - a página rolar na horizontal ou algo passar da borda da tela;
//  - o tabuleiro não for quadrado, sair da tela ou ficar pequeno demais;
//  - um rótulo de botão for cortado com "…";
//  - um alvo de toque tiver menos de 40 px;
//  - um texto vazar da própria caixa;
//  - a tela de login rolar no desktop.
import { assertFits, BASE, ensureAccount, launch, openPage, report, shot, tapSquare } from './helpers.mjs';

const PHONES = [
  { name: '320x568', width: 320, height: 568 },
  { name: '360x640', width: 360, height: 640 },
  { name: '375x667', width: 375, height: 667 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
  { name: '430x932', width: 430, height: 932 },
  { name: 'deitado-568x320', width: 568, height: 320 },
  { name: 'deitado-844x390', width: 844, height: 390 },
  { name: 'tablet-768x1024', width: 768, height: 1024 },
];
const DESKTOPS = [
  { name: '1024x600', width: 1024, height: 600, touch: false },
  { name: '1280x620', width: 1280, height: 620, touch: false },
  { name: '1366x657', width: 1366, height: 657, touch: false },
  { name: '1366x768', width: 1366, height: 768, touch: false },
  { name: '1920x1080', width: 1920, height: 1080, touch: false },
];

const ROUTES = [
  '/', '/jogar', '/amigo', '/carreira', '/aprender', '/aulas', '/aulas/controle-do-centro', '/professores/tio-renan',
  '/desafios', '/perfil', '/admin', '/partida?bot=tio-guilherme&modo=treino&cor=w', '/ensino/controle-do-centro',
  '/desafio/corredor', '/laboratorio?pos=liga-garfo', '/posicao?p=eyJuIjoiR2FyZm8iLCJkIjoiIiwiZiI6InIzazMvOC84LzNONC84LzgvOC80SzMgdyAtIC0gMCAxIiwiYSI6WyIiLCIiXX0',
];

const only = process.env.E2E_VP?.split(',');
const pick = (list) => (only ? list.filter((v) => only.includes(v.name)) : list);

const failures = [];
const guard = async (label, fn) => {
  try {
    await fn();
  } catch (err) {
    failures.push(`${label}: ${String(err.message ?? err).split('\n')[0].slice(0, 400)}`);
  }
};
const dialog = (page) => page.getByRole('dialog');
const closeSheet = async (page) => {
  await page.getByRole('button', { name: 'Fechar' }).first().click();
  await page.waitForTimeout(150);
};

/** Abre cada folha/diálogo/aba importante e confere o layout com ele aberto. */
async function states(page, vp) {
  const at = (name) => `${name}@${vp.name}`;
  const fit = (name) => assertFits(page, at(name));

  await guard(at('jogar: começar partida'), async () => {
    await page.goto(BASE + '/jogar', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Jogar contra Tio Marcão' }).click();
    await dialog(page).getByRole('button', { name: 'Começar partida' }).waitFor();
    await fit('folha de começar partida');
    await closeSheet(page);
  });

  await guard(at('partida'), async () => {
    await page.goto(BASE + '/partida?bot=tio-guilherme&modo=treino&cor=w', { waitUntil: 'networkidle' });
    await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
    await tapSquare(page, 'e2');
    await tapSquare(page, 'e4');
    await page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor({ timeout: 20000 });
    await fit('partida em andamento');
    await page.getByRole('button', { name: 'Desistir' }).click();
    await fit('confirmar desistência');
    await dialog(page).getByRole('button', { name: 'Desistir' }).click();
    await page.getByRole('heading', { name: 'Derrota' }).waitFor();
    await page.waitForTimeout(500);
    await fit('resultado da partida');
    if (vp.name === '320x568') await shot(page, 'resp-resultado-320');
  });

  await guard(at('promoção'), async () => {
    await page.goto(`${BASE}/partida?bot=tio-guilherme&modo=laboratorio&cor=w&fen=${encodeURIComponent('8/5P1k/5K2/8/8/8/8/8 w - - 0 1')}`, { waitUntil: 'networkidle' });
    await page.getByRole('status').filter({ hasText: 'Sua vez' }).waitFor();
    await tapSquare(page, 'f7');
    await tapSquare(page, 'f8');
    await dialog(page).getByRole('button', { name: 'Torre' }).waitFor();
    await fit('escolha de promoção');
  });

  await guard(at('laboratório'), async () => {
    await page.goto(BASE + '/laboratorio', { waitUntil: 'networkidle' });
    await dialog(page).getByRole('button', { name: /Posição inicial/ }).waitFor();
    await fit('lab: como começar');
    await dialog(page).getByRole('button', { name: /Posição inicial/ }).click();
    await fit('lab: montar (peças)');
    await page.getByRole('button', { name: 'Setas e marcações' }).click();
    await fit('lab: montar (marcações)');
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await fit('lab: menu');
    await dialog(page).getByRole('button', { name: /Importar \/ exportar FEN/ }).click();
    await fit('lab: FEN');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Salvar posição' }).click();
    await fit('lab: salvar');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Mais opções' }).click();
    await dialog(page).getByRole('button', { name: /Minhas posições/ }).click();
    await dialog(page).getByRole('button', { name: 'Da Liga X' }).click();
    await fit('lab: posições');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Jogar daqui' }).click();
    await dialog(page).getByRole('button', { name: 'Começar' }).waitFor();
    await fit('lab: jogar daqui');
    await closeSheet(page);
    await page.getByRole('tab', { name: 'Analisar' }).click();
    await page.waitForFunction(() => /Melhor lance/i.test(document.body.innerText), null, { timeout: 20000 });
    await fit('lab: analisar');
    if (vp.name === '320x568') await shot(page, 'resp-lab-analise-320');
  });

  await guard(at('ensino e desafio'), async () => {
    await page.goto(BASE + '/ensino/sacrificio', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    await fit('ensino');
    await page.goto(BASE + '/desafio/relampago', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await fit('desafio com relógio');
  });

  await guard(at('amigo'), async () => {
    await page.goto(BASE + '/amigo', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Criar e convidar' }).click();
    await page.waitForURL(/\/amigo\/[A-Z0-9]{6}$/);
    await page.getByText('Passe este código').waitFor();
    await fit('convite de partida online');
    if (vp.name === '320x568') await shot(page, 'resp-convite-320');
    await page.getByRole('button', { name: 'Cancelar convite' }).click();
    await page.waitForURL(/\/amigo$/);
  });

  await guard(at('painel'), async () => {
    await page.goto(BASE + '/admin', { waitUntil: 'networkidle' });
    await fit('painel: aulas');
    await page.getByRole('button', { name: 'Nova aula' }).click();
    await fit('painel: nova aula (YouTube)');
    await dialog(page).getByRole('button', { name: 'Enviar arquivo' }).click();
    await fit('painel: nova aula (arquivo)');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Professores' }).click();
    await fit('painel: professores');
    await page.getByRole('button', { name: 'Novo professor' }).click();
    await fit('painel: novo professor');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Contas' }).click();
    await page.getByLabel('Buscar conta').waitFor();
    await page.waitForTimeout(400);
    await fit('painel: contas');
    if (vp.name === '320x568') await shot(page, 'resp-admin-contas-320');
    await page.locator('main li button').first().click();
    await fit('painel: permissão da conta');
    await closeSheet(page);
  });

  await guard(at('perfil'), async () => {
    await page.goto(BASE + '/perfil', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Editar perfil' }).click();
    await fit('perfil: editar');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Trocar senha' }).click();
    await fit('perfil: trocar senha');
    await closeSheet(page);
    await page.getByRole('button', { name: 'Sair da conta' }).click();
    await fit('perfil: sair');
    await closeSheet(page);
  });
}

const browser = await launch();

// ── login e cadastro: celular (rola normalmente) e desktop (não pode rolar) ──
for (const vp of pick([...PHONES, ...DESKTOPS])) {
  const { context, page, problems } = await openPage(browser, vp);
  for (const tab of ['Entrar', 'Criar conta']) {
    await guard(`login (${tab})@${vp.name}`, async () => {
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.getByRole('tab', { name: tab }).click();
      await assertFits(page, `login (${tab})@${vp.name}`);
      if (vp.width >= 1024) {
        const s = await page.evaluate(() => {
          const form = document.querySelector('.auth-form');
          return { doc: document.documentElement.scrollHeight, vh: window.innerHeight, form: form.scrollHeight, formBox: form.clientHeight };
        });
        if (s.doc > s.vh) throw new Error(`a página rola (${s.doc} > ${s.vh})`);
        if (s.form > s.formBox + 1) throw new Error(`o formulário rola (${s.form} > ${s.formBox})`);
      }
    });
  }
  if (['320x568', '1024x600', '1366x657'].includes(vp.name)) await shot(page, `resp-login-${vp.name}`);
  failures.push(...problems.map((p) => `login@${vp.name} ${p}`));
  await context.close();
}
console.log('  login e cadastro: conferidos em', pick([...PHONES, ...DESKTOPS]).length, 'tamanhos');

// ── app logado: rotas + estados abertos ──
const first = await openPage(browser);
await ensureAccount(first.page, 'AdminE2E', 'admin@ligax.test');
const state = await first.context.storageState();
await first.context.close();

for (const vp of pick([...PHONES, DESKTOPS[2]])) {
  const { context, page, problems } = await openPage(browser, { ...vp, storageState: state });
  for (const route of ROUTES) {
    await guard(`${route}@${vp.name}`, async () => {
      await page.goto(BASE + route, { waitUntil: 'networkidle' });
      if (route === '/laboratorio') await dialog(page).getByRole('button', { name: /Posição inicial/ }).click();
      await page.waitForTimeout(300);
      const info = await assertFits(page, `${route.split('?')[0]}@${vp.name}`);
      if (info.board && info.board.width < 230) throw new Error(`tabuleiro pequeno demais (${Math.round(info.board.width)}px)`);
    });
  }
  await states(page, vp);
  failures.push(...problems.filter((p) => !/status of 4\d\d|youtube|google/.test(p)).map((p) => `@${vp.name} ${p}`));
  await context.close();
  console.log(`  ${vp.name}: ${ROUTES.length} rotas + estados abertos`);
}

await browser.close();
report('responsividade', failures);
