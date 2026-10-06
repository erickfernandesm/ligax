// Visita todas as rotas em todas as larguras exigidas e confere:
// sem erro de console, sem rolagem horizontal, tabuleiro dentro da tela.
import { assertFits, BASE, launch, openPage, report, shot, signIn } from './helpers.mjs';

const VIEWPORTS = [
  { name: '320', width: 320, height: 568 },
  { name: '375', width: 375, height: 667 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: 'paisagem', width: 667, height: 375 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'notebook', width: 1366, height: 768, touch: false },
  { name: 'desktop', width: 1920, height: 1080, touch: false },
];

const ROUTES = [
  ['home', '/'],
  ['jogar', '/jogar'],
  ['carreira', '/carreira'],
  ['amigo', '/amigo'],
  ['aprender', '/aprender'],
  ['aulas', '/aulas'],
  ['aula', '/aulas/controle-do-centro'],
  ['professor', '/professores/tio-renan'],
  ['desafios', '/desafios'],
  ['perfil', '/perfil'],
  ['admin', '/admin'],
  ['partida', '/partida?bot=tio-guilherme&modo=treino&cor=w'],
  ['ensino', '/ensino/controle-do-centro'],
  ['desafio', '/desafio/corredor'],
  ['laboratorio', '/laboratorio?pos=liga-garfo'],
  ['laboratorio-montar', '/laboratorio'],
];

const browser = await launch();
// tela de login/cadastro em celular pequeno e desktop
for (const vp of [VIEWPORTS[0], VIEWPORTS[2], VIEWPORTS[6]]) {
  const { context, page } = await openPage(browser, vp);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await assertFits(page, `cadastro@${vp.name}`);
  await shot(page, `login-${vp.name}`);
  await context.close();
}
const first = await openPage(browser);
const state = await signIn(first.page, `Rotas${Date.now() % 100000}`);
await shot(first.page, 'onboarding-depois');
await first.context.close();

const failures = [];
const shots = new Set((process.env.E2E_SHOT_SIZES ?? '320,390,paisagem,notebook').split(','));

for (const vp of VIEWPORTS) {
  const { context, page, problems } = await openPage(browser, { ...vp, storageState: state });
  for (const [name, path] of ROUTES) {
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      if (name === 'laboratorio-montar') {
        await page.getByRole('dialog').getByRole('button', { name: /Posição inicial/ }).click();
      }
      await page.waitForTimeout(350);
      const info = await assertFits(page, `${name}@${vp.name}`);
      if (info.board && info.board.width < 240) failures.push(`${name}@${vp.name}: tabuleiro pequeno demais (${Math.round(info.board.width)}px)`);
      if (shots.has(vp.name)) await shot(page, `${name}-${vp.name}`);
    } catch (err) {
      failures.push(String(err.message ?? err));
    }
  }
  failures.push(...problems.map((p) => `@${vp.name} ${p}`));
  await context.close();
  console.log(`  ${vp.name}: ${ROUTES.length} rotas`);
}

await browser.close();
report('rotas e responsividade', failures);
