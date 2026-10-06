// Ensino, desafios, nível, aulas em vídeo, permissões do painel, laboratório
// e dados da conta sincronizados.
// O servidor de teste precisa subir com LIGAX_ADMIN_EMAILS=admin@ligax.test.
import {
  BASE,
  ensureAccount,
  freshEmail,
  launch,
  logIn,
  move,
  openPage,
  readBoard,
  report,
  settle,
  shot,
  signIn,
  squareCenter,
  tapSquare,
  unexpected,
} from './helpers.mjs';

const failures = [];
const check = (cond, msg) => {
  if (!cond) failures.push(msg);
  console.log(`  ${cond ? 'ok ' : 'FALHOU'} ${msg}`);
};
const tag = Date.now() % 100000;

const browser = await launch();
const { context, page, problems } = await openPage(browser, { width: 390, height: 844 });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
const studentEmail = freshEmail('aluno');
const studentNick = `Aluno${tag}`;
await signIn(page, studentNick, studentEmail);
const text = (p = page) => p.locator('body').innerText();
const waitText = (re, timeout = 10000, p = page) =>
  p.waitForFunction((src) => new RegExp(src, 'i').test(document.body.innerText), re.source, { timeout });

// ───────── Modo Ensino ─────────
console.log('Modo Ensino');
await page.goto(BASE + '/aprender');
await page.getByRole('link', { name: /Controle do centro/ }).click();
await page.waitForURL(/\/ensino\/controle-do-centro/);
await waitText(/quatro casas são o centro/);
check((await page.locator('[data-board] [data-square] span.opacity-70').count()) === 4, 'professor destaca as 4 casas do centro');
await page.getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('button', { name: 'Continuar' }).click();
await waitText(/Sua vez: faça o lance/);
await move(page, 'd2', 'd4');
await waitText(/Toque no peão de e2/);
check((await readBoard(page)).board.d2 === 'wP', 'lance errado volta e o professor dá a dica');
await move(page, 'e2', 'e4');
await waitText(/Peão no centro/);
await page.waitForTimeout(1100);
check((await readBoard(page)).board.e5 === 'bP', 'adversário responde sozinho (e5)');
await page.getByRole('button', { name: 'Continuar' }).click();
await move(page, 'g1', 'f3');
await waitText(/desenvolve e ataca/);
await page.getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('button', { name: 'Concluir lição' }).click();
await page.getByRole('heading', { name: 'Lição concluída' }).waitFor();
await page.waitForTimeout(900);
check(/\+30 XP/.test(await text()), 'lição concluída dá +30 XP');

// ───────── Modo Desafio + nível ─────────
console.log('Modo Desafio e nível');
await page.goto(BASE + '/desafios');
await waitText(/Desafio do Haroldo/);
check(!/Dono da Liga/i.test(await text()), 'Haroldo aparece só como "Haroldo"');
await page.goto(BASE + '/desafio/escada');
await page.waitForURL(/\/desafios$/);
check(true, 'desafio de grupo bloqueado redireciona para a lista');
await page.getByRole('link', { name: /Corredor/ }).click();
await waitText(/Brancas jogam\. Mate em 1/);
await move(page, 'e1', 'e7');
await waitText(/Observe a posição do rei adversário/);
check((await readBoard(page)).board.e1 === 'wR', 'erro: a peça volta e o Haroldo comenta');
await move(page, 'e1', 'e8');
await waitText(/Mate do corredor/);
// 30 (lição) + 15 (desafio) = 45 XP → passou de 42: nível 2
await page.getByRole('dialog').getByText('Nível 2').waitFor();
check(true, 'desafio + lição sobem a conta para o nível 2 (Haroldo anuncia)');
await shot(page, 'nivel-2');
await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('link', { name: 'Próximo desafio' }).click();
await page.waitForURL(/\/desafio\/pastor/);
await move(page, 'h5', 'f7');
await waitText(/Mate do Pastor\. Agora/);
await page.getByRole('link', { name: 'Próximo desafio' }).click();
await page.waitForURL(/\/desafio\/dama-e-rei/);
await move(page, 'f7', 'g7');
await page.getByRole('dialog').getByText('Novo desafio desbloqueado').waitFor();
check(true, 'Haroldo anuncia o grupo desbloqueado');
await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();

// ───────── Aulas: só vídeo publicado aparece; painel é restrito ─────────
console.log('Aulas e permissões');
await page.goto(BASE + '/aulas');
await waitText(/Todas as aulas/);
await page.goto(BASE + '/admin');
await waitText(/Sua conta não tem acesso ao painel/);
check(true, 'aluno não entra no painel');
const forbidden = await page.evaluate(async () => {
  const r = await fetch('/api/content/lessons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"title":"x"}' });
  const u = await fetch('/api/admin/users');
  return [r.status, u.status];
});
check(forbidden[0] === 403 && forbidden[1] === 403, 'a API também recusa o aluno (403)');
await page.goto(BASE + '/perfil');
await waitText(/Ajustes/);
check(!/Painel do professor|Administração/.test(await text()), 'perfil do aluno não mostra o painel');

// admin (conta definida em LIGAX_ADMIN_EMAILS)
const admin = await openPage(browser, { width: 390, height: 844 });
await ensureAccount(admin.page, 'AdminE2E', 'admin@ligax.test');
const A = admin.page;
await A.goto(BASE + '/admin');
await waitText(/Conteúdo/, 10000, A);
check(/Contas/.test(await text(A)) && /Professores/.test(await text(A)), 'admin vê Aulas, Professores e Contas');

// publicar aula exige vídeo
const lessonTitle = `Abertura Italiana ${tag}`;
await A.getByRole('button', { name: 'Nova aula' }).click();
let form = A.getByRole('dialog');
await form.getByLabel('Título').fill(lessonTitle);
await form.getByLabel('Professor').selectOption('tio-guilherme');
await form.getByLabel('Publicada').check();
await form.getByRole('button', { name: 'Salvar aula' }).click();
await waitText(/adicione o vídeo antes de publicar/, 10000, A);
check(true, 'aula sem vídeo não pode ser publicada');
await form.getByLabel('Link do vídeo').fill('link-quebrado');
await form.getByRole('button', { name: 'Salvar aula' }).click();
await waitText(/link do YouTube não parece válido/, 10000, A);
check(true, 'painel valida o link do vídeo');
await form.getByLabel('Link do vídeo').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
await form.getByLabel('Posição para praticar').selectOption({ label: 'Garfo de cavalo' });
await form.getByRole('button', { name: 'Salvar aula' }).click();
await A.locator('li', { hasText: lessonTitle }).getByText('Publicada').waitFor();
check(true, 'aula em vídeo criada e publicada pelo painel');
await shot(A, 'admin-aulas');

// upload de arquivo de vídeo para o servidor
await A.getByRole('button', { name: 'Nova aula' }).click();
form = A.getByRole('dialog');
await form.getByLabel('Título').fill(`Aula com arquivo ${tag}`);
await form.getByRole('button', { name: 'Enviar arquivo' }).click();
await form.locator('input[type=file][accept^="video"]').setInputFiles({
  name: 'aula.mp4',
  mimeType: 'video/mp4',
  buffer: Buffer.alloc(4096, 7),
});
await form.getByText('aula.mp4').waitFor();
await form.getByRole('button', { name: 'Salvar aula' }).click();
await A.locator('li', { hasText: `Aula com arquivo ${tag}` }).getByText('com vídeo').waitFor();
const media = await A.evaluate(async (title) => {
  const { lessons } = await (await fetch('/api/content')).json();
  const l = lessons.find((x) => x.title === title);
  const r = await fetch(`/api/media/${l.video.mediaId}`, { headers: { Range: 'bytes=0-99' } });
  return { status: r.status, length: (await r.arrayBuffer()).byteLength, range: r.headers.get('content-range') };
}, `Aula com arquivo ${tag}`);
check(media.status === 206 && media.length === 100 && media.range === 'bytes 0-99/4096', 'vídeo enviado fica no servidor e é servido por trechos');

// aluno assiste: vídeo, +XP, prática
await page.goto(BASE + '/aulas');
await page.getByRole('link', { name: new RegExp(lessonTitle) }).click();
await page.locator('iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]').waitFor();
check(true, 'aluno vê a aula publicada com o player');
check(!new RegExp(`Aula com arquivo ${tag}`).test(await text()), 'rascunho não aparece para o aluno');
await page.getByRole('button', { name: /Marcar como assistida/ }).click();
await waitText(/Aula assistida/);
check(true, 'assistir a aula marca como assistida (+40 XP)');
// 75 + 40 = 115 XP: passou de 88, nível 3
await page.getByRole('dialog').getByText('Nível 3').waitFor();
check(true, 'aula assistida sobe o nível (nível 3)');
await page.getByRole('dialog').getByRole('button', { name: 'Continuar' }).click();
await page.getByRole('link', { name: 'Abrir posição' }).click();
await page.waitForURL(/\/laboratorio\?p=/);
await waitText(/Avaliação da posição/);
check((await readBoard(page)).board.d5 === 'wN', 'vídeo → prática: a posição da aula abre no Laboratório');

// ───────── Laboratório: análise com UMA linha, sem aba Professor ─────────
console.log('Laboratório');
await page.waitForFunction(() => /Melhor lance/i.test(document.body.innerText), null, { timeout: 20000 });
check(!/Variantes/i.test(await text()), 'análise mostra só uma linha (sem lista de variantes)');
check((await page.locator('[data-board] svg polygon').count()) === 1, 'uma única seta de melhor lance');
check((await page.getByRole('tab').count()) === 2 && (await page.getByRole('tab', { name: 'Professor' }).count()) === 0, 'aba "Professor" removida');
await shot(page, 'lab-analise');
await move(page, 'd5', 'c7');
await waitText(/Nc7\+/);
await page.getByRole('button', { name: 'Voltar lance' }).click();
await settle(page);
check((await readBoard(page)).board.d5 === 'wN', 'análise: voltar lance');

await page.goto(BASE + '/laboratorio');
await page.getByRole('dialog').getByRole('button', { name: /Tabuleiro vazio/ }).click();
await page.getByRole('button', { name: 'Jogar daqui' }).click();
await waitText(/Falta o rei branco/);
check(true, 'posição sem reis é recusada com explicação');
const place = async (label, square) => {
  await page.getByRole('button', { name: label, exact: true }).click();
  await tapSquare(page, square);
};
await place('Rei branco', 'e1');
await place('Rei preto', 'e8');
await place('Torre branco', 'a1');
await place('Peão preto', 'h5');
const b = (await readBoard(page)).board;
check(b.e1 === 'wK' && b.e8 === 'bK' && b.a1 === 'wR' && b.h5 === 'bP', 'selecionar peça → tocar na casa → peça aparece');
await page.getByRole('button', { name: 'Setas e marcações' }).click();
await tapSquare(page, 'a8');
const a1 = await squareCenter(page, 'a1');
const a8 = await squareCenter(page, 'a8');
await page.mouse.move(a1.x, a1.y);
await page.mouse.down();
await page.mouse.move(a1.x, (a1.y + a8.y) / 2, { steps: 5 });
await page.mouse.move(a8.x, a8.y, { steps: 5 });
await page.mouse.up();
check((await page.locator('[data-board] svg polygon').count()) === 1, 'seta desenhada arrastando de a1 a a8');
await page.getByRole('button', { name: 'Salvar posição' }).click();
await page.getByRole('dialog').getByLabel('Nome').fill('Final de Torre');
await page.getByRole('dialog').getByRole('button', { name: 'Salvar', exact: true }).click();
await waitText(/Posição salva/);
await page.getByRole('button', { name: 'Mais opções' }).click();
await page.getByRole('button', { name: /Compartilhar posição/ }).click();
await waitText(/Link copiado/);
const link = await page.evaluate(() => navigator.clipboard.readText());
const guest = await openPage(browser, { width: 390, height: 844 });
await guest.page.goto(link);
await guest.page.getByRole('heading', { name: 'Final de Torre' }).waitFor();
check((await readBoard(guest.page)).board.e1 === 'wK', 'link compartilhado abre a mesma posição, sem conta');
await guest.context.close();
await page.getByRole('button', { name: 'Jogar daqui' }).click();
await page.getByRole('dialog').getByRole('button', { name: /Renan/ }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Começar' }).click();
await page.waitForURL(/modo=laboratorio/);
await page.getByRole('status').filter({ hasText: /Sua vez/ }).waitFor();
check(Object.keys((await readBoard(page)).board).length === 4, '"Jogar a partir daqui" começa na posição montada');

// ───────── admin libera a conta do aluno como professor ─────────
console.log('Permissão de professor');
await A.goto(BASE + '/admin');
await A.getByRole('button', { name: 'Contas' }).click();
await A.getByLabel('Buscar conta').fill(studentNick);
await A.getByRole('button', { name: `Permissão de ${studentNick}` }).click();
await shot(A, 'admin-contas');
await A.getByRole('radio', { name: /^Professor/ }).click();
await A.locator('li', { hasText: studentNick }).getByText('Professor').waitFor();
check(true, 'admin libera a conta como professor');
await page.goto(BASE + '/admin');
await page.getByRole('button', { name: 'Nova aula' }).waitFor();
check(!/Contas/.test(await page.locator('main').innerText()), 'professor gerencia aulas, mas não as contas');
const prof = await page.evaluate(async () => (await fetch('/api/admin/users')).status);
check(prof === 403, 'API de contas continua fechada para o professor');
await page.goto(BASE + '/perfil');
await waitText(/Painel do professor/);
check(true, 'perfil do professor mostra o painel');

// ───────── dados ficam na conta: sair, entrar, e está tudo lá ─────────
console.log('Conta sincronizada');
const before = await page.locator('main').innerText();
check(/Nível [2-9]/i.test(before), 'nível subiu com desafios, lição e aula');
await page.waitForTimeout(1200); // envio ao servidor
await page.getByRole('button', { name: 'Sair da conta' }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Sair', exact: true }).click();
await page.getByRole('heading', { name: 'Entre na sua conta' }).waitFor();
const other = await openPage(browser, { width: 390, height: 844 }); // "outro aparelho"
await logIn(other.page, studentEmail);
await other.page.getByRole('heading', { name: 'Bora jogar?' }).waitFor();
await other.page.goto(BASE + '/perfil');
await waitText(/Histórico recente/, 10000, other.page);
const after = await other.page.locator('main').innerText();
const xp = (t) => (t.match(/(\d+) \/ \d+ XP/) ?? [])[1];
check(xp(after) === xp(before) && Number(xp(after)) >= 115, `progresso veio do servidor em outro aparelho (${xp(after)} XP)`);
check(/Primeira Lição/.test(after) && /Cientista do Tabuleiro/.test(after), 'conquistas vieram junto');
await other.page.goto(BASE + '/laboratorio');
await other.page.getByRole('dialog').getByRole('button', { name: /Minhas posições/ }).click();
await other.page.getByRole('dialog').getByRole('button', { name: /Final de Torre/ }).first().waitFor();
check(true, 'posições salvas vieram junto');
await shot(other.page, 'perfil');

// limpeza: tira as aulas criadas neste teste
await A.goto(BASE + '/admin');
for (const title of [lessonTitle, `Aula com arquivo ${tag}`]) {
  await A.locator('li', { hasText: title }).getByRole('button', { name: /Excluir aula/ }).click();
  await A.getByRole('dialog').getByRole('button', { name: 'Excluir' }).click();
  await A.locator('li', { hasText: title }).waitFor({ state: 'detached' });
}

await browser.close();
report('funcionalidades', [
  ...failures,
  ...unexpected([...problems, ...admin.problems, ...other.problems]).filter((p) => !/youtube|ytimg|doubleclick|googlevideo|gstatic|google\.com/.test(p)),
]);
