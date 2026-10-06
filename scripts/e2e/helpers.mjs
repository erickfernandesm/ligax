// Utilitários dos testes de ponta a ponta (Playwright + Chrome instalado).
// Suba o app (npm run dev) e rode: node scripts/e2e/<arquivo>.mjs
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
export const SHOTS = process.env.E2E_SHOTS ?? join(process.cwd(), '.e2e-shots');
mkdirSync(SHOTS, { recursive: true });

export async function launch() {
  return chromium.launch({
    channel: process.env.E2E_CHANNEL ?? 'chrome',
    headless: true,
    // navegador de teste sem cache em disco
    args: ['--disk-cache-size=1', '--media-cache-size=1', '--disable-gpu-shader-disk-cache'],
  });
}

/** Abre uma página coletando erros de console e de rede. */
export async function openPage(browser, { width = 390, height = 844, storageState, touch = true } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    hasTouch: touch,
    isMobile: touch && width < 800,
    storageState,
    locale: 'pt-BR',
  });
  const page = await context.newPage();
  const problems = [];
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && !r.url().includes('favicon')) problems.push(`http ${r.status()}: ${r.url()}`);
  });
  return { context, page, problems };
}

export const PASSWORD = 'senha-de-teste-123';
let seq = 0;
/** E-mail que não se repete entre execuções. */
export const freshEmail = (tag = 'aluno') => `${tag}-${Date.now().toString(36)}${seq++}@ligax.test`;

/** Cria uma conta pela tela de cadastro e devolve o estado salvo (cookie de sessão). */
export async function signIn(page, name = 'Erick', email = freshEmail()) {
  await page.goto(BASE + '/');
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('Nick').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  await page.getByRole('heading', { name: 'Bora jogar?' }).waitFor();
  return page.context().storageState();
}

/** Entra numa conta que já existe. */
export async function logIn(page, email, password = PASSWORD) {
  await page.goto(BASE + '/');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
}

export const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

/** Centro de uma casa do tabuleiro, em pixels da página. */
export async function squareCenter(page, square) {
  const box = await page.locator(`[data-board] [data-square="${square}"]`).first().boundingBox();
  if (!box) throw new Error(`casa ${square} não encontrada`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Toca numa casa (toque → toque é a interação principal no celular). */
export async function tapSquare(page, square) {
  const { x, y } = await squareCenter(page, square);
  await page.mouse.click(x, y);
}

/** Tempo da animação de uma peça andando. */
export const settle = (page) => page.waitForTimeout(300);

export async function move(page, from, to) {
  await tapSquare(page, from);
  await tapSquare(page, to);
  await settle(page);
}

/** Lê a posição atual a partir do DOM: { e4: 'wP', ... }. */
export function readBoard(page) {
  return page.evaluate(() => {
    const board = document.querySelector('[data-board]');
    const rect = board.getBoundingClientRect();
    const squares = [...board.querySelectorAll('[data-square]')].map((el) => ({ sq: el.dataset.square, r: el.getBoundingClientRect() }));
    const out = {};
    for (const img of board.querySelectorAll('img')) {
      const b = img.getBoundingClientRect();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const hit = squares.find((s) => cx >= s.r.left && cx < s.r.right && cy >= s.r.top && cy < s.r.bottom);
      const code = img.getAttribute('src').split('/').pop().replace('.svg', '');
      if (hit) out[hit.sq] = code;
    }
    return { board: out, width: rect.width, left: rect.left, right: rect.right };
  });
}

/** Falha se a página rolar na horizontal ou o tabuleiro passar da tela. */
export async function assertFits(page, label) {
  const device = page.viewportSize().width;
  const info = await page.evaluate((device) => {
    const b = document.querySelector('[data-board]')?.getBoundingClientRect();
    const vw0 = device;
    const clipped = [];
    for (const el of document.querySelectorAll('button, a, h1, h2, h3, p, input, textarea, select')) {
      if (el.closest('.overflow-x-auto, [aria-hidden=true]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > vw0 + 1 || r.left < -1) clipped.push((el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30));
    }
    // rótulos de botão cortados com "…"
    const truncated = [];
    for (const el of document.querySelectorAll('button .truncate, a.inline-flex .truncate, [role=tab], [role=radio]')) {
      if (el.scrollWidth > el.clientWidth + 1) truncated.push(el.textContent.trim().slice(0, 30));
    }
    // alvos de toque pequenos demais para o dedo
    const small = [];
    for (const el of document.querySelectorAll('button, a[href], input:not([type=hidden]):not(.sr-only), select, textarea, [role=switch]')) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const st = getComputedStyle(el);
      if (st.visibility === 'hidden' || st.display === 'inline') continue; // link dentro de frase
      if (el.type === 'checkbox' || el.type === 'file') continue; // a área de toque é o rótulo em volta
      if (r.height < 40 || r.width < 40) small.push(`${(el.textContent || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 24)} (${Math.round(r.width)}×${Math.round(r.height)})`);
    }
    // texto vazando da própria caixa (por cima do vizinho)
    const spilled = [];
    for (const el of document.querySelectorAll('h1, h2, h3, p, span, button, a, label, li')) {
      if (el.closest('.overflow-x-auto, [aria-hidden=true], .invisible')) continue;
      if (el.clientWidth === 0 || !el.textContent.trim()) continue;
      const st = getComputedStyle(el);
      if (st.display === 'inline' || st.overflowX !== 'visible') continue;
      if (el.scrollWidth > el.clientWidth + 2) spilled.push(el.textContent.trim().slice(0, 30));
    }
    return {
      clipped,
      truncated,
      small,
      spilled,
      vw: device,
      layoutW: window.innerWidth,
      scrollW: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      board: b ? { left: b.left, right: b.right, width: b.width, height: b.height } : null,
    };
  }, device);
  const issues = [];
  if (info.scrollW > info.vw + 1 || info.layoutW > info.vw + 1) {
    issues.push(`conteúdo mais largo que a tela (${Math.max(info.scrollW, info.layoutW)} > ${info.vw})`);
  }
  if (info.clipped.length) issues.push('elementos cortados: ' + [...new Set(info.clipped)].join(' | '));
  if (info.truncated.length) issues.push('rótulos com "…": ' + [...new Set(info.truncated)].join(' | '));
  if (info.small.length) issues.push('toque pequeno: ' + [...new Set(info.small)].join(' | '));
  if (info.spilled.length) issues.push('texto vazando: ' + [...new Set(info.spilled)].join(' | '));
  if (info.board) {
    if (info.board.left < -0.5 || info.board.right > info.vw + 0.5) issues.push(`tabuleiro fora da tela (${JSON.stringify(info.board)})`);
    if (Math.abs(info.board.width - info.board.height) > 1) issues.push('tabuleiro não é quadrado');
  }
  if (issues.length) throw new Error(`${label}: ${issues.join('; ')}`);
  return info;
}

export function report(name, problems) {
  if (problems.length) {
    console.error(`\n${name}: ${problems.length} problema(s)`);
    for (const p of [...new Set(problems)]) console.error('  - ' + p);
    process.exitCode = 1;
  } else {
    console.log(`${name}: ok`);
  }
}

/** Cria a conta ou, se ela já existir (execução anterior), entra nela. */
export async function ensureAccount(page, name, email) {
  await page.goto(BASE + '/');
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('Nick').fill(name);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();
  const home = page.getByRole('heading', { name: 'Bora jogar?' });
  const result = await Promise.race([
    home.waitFor().then(() => 'ok'),
    page.getByRole('alert').filter({ hasText: /Já existe|já está em uso/ }).waitFor().then(() => 'exists'),
  ]);
  if (result === 'exists') {
    await page.getByRole('tab', { name: 'Entrar' }).click();
    await page.getByLabel('Senha', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Entrar', exact: true }).last().click();
    await home.waitFor();
  }
}

/**
 * Tira da lista os erros que os testes provocam de propósito (respostas 4xx
 * da API, como "senha errada"). Qualquer outro erro continua contando.
 */
export function unexpected(problems) {
  return problems.filter((p) => !/status of 4\d\d/.test(p) && !(/^http 4\d\d/.test(p) && p.includes('/api/')));
}
