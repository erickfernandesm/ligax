import type { TeachModule } from '@/core/domain/types';

// Módulos do Modo Ensino. Cada passo é um balão do professor:
//  - say:  o professor fala (pode marcar casas e desenhar setas)
//  - demo: o professor joga lances no tabuleiro
//  - play: o aluno precisa encontrar um dos lances de `expect`
// `npm run validate` confere todas as posições e lances.

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const TEACH_MODULES: TeachModule[] = [
  // ───────────── Tio Guilherme · Fundamentos ─────────────
  {
    id: 'movimento-das-pecas',
    professorId: 'tio-guilherme',
    title: 'Como as peças andam',
    summary: 'Torre, bispo, cavalo, dama, peão e rei. Uma de cada vez.',
    concept: 'Movimento das peças',
    minutes: 4,
    xp: 30,
    steps: [
      {
        kind: 'say',
        fen: '4k3/8/8/8/3R4/8/8/4K3 w - - 0 1',
        text: 'Começando pela torre. Ela anda em linha reta: pra frente, pra trás e pros lados. Quantas casas quiser.',
        arrows: [
          { from: 'd4', to: 'd8', color: 'idea' },
          { from: 'd4', to: 'd1', color: 'idea' },
          { from: 'd4', to: 'a4', color: 'idea' },
          { from: 'd4', to: 'h4', color: 'idea' },
        ],
      },
      {
        kind: 'play',
        fen: '4k3/8/8/3p4/8/8/8/3RK3 w - - 0 1',
        text: 'Tem um peão preto parado na coluna da sua torre. Captura ele.',
        expect: ['Rxd5'],
        hint: 'A torre está em d1. Suba pela coluna até d5.',
        successText: 'Isso! Capturar é só ocupar a casa da peça adversária.',
      },
      {
        kind: 'say',
        fen: '4k3/8/8/8/3B4/8/8/4K3 w - - 0 1',
        text: 'O bispo só anda na diagonal. Repara: ele nunca troca de cor de casa.',
        arrows: [
          { from: 'd4', to: 'h8', color: 'idea' },
          { from: 'd4', to: 'a1', color: 'idea' },
          { from: 'd4', to: 'a7', color: 'idea' },
          { from: 'd4', to: 'g1', color: 'idea' },
        ],
      },
      {
        kind: 'play',
        fen: '4k3/8/5n2/8/8/2B5/8/4K3 w - - 0 1',
        text: 'Seu bispo está em c3. Tem um cavalo preto na diagonal dele. Pega.',
        expect: ['Bxf6'],
        hint: 'Siga a diagonal: d4, e5, f6.',
        successText: 'Boa. Bispo gosta de diagonal aberta.',
      },
      {
        kind: 'say',
        fen: '4k3/8/8/8/4N3/8/8/4K3 w - - 0 1',
        text: 'O cavalo anda em L: duas casas numa direção e uma pro lado. É a única peça que pula por cima das outras.',
        squares: ['f6', 'd6', 'g5', 'c5', 'g3', 'c3', 'f2', 'd2'].map((square) => ({ square, color: 'idea' as const })),
      },
      {
        kind: 'play',
        fen: '4k3/8/8/8/8/5r2/8/4K1N1 w - - 0 1',
        text: 'Seu cavalo está em g1 e tem uma torre preta ao alcance do L. Pega ela.',
        expect: ['Nxf3'],
        hint: 'De g1: duas casas pra cima, uma pro lado. Dá em f3.',
        successText: 'Uma torre de graça! Cavalo é traiçoeiro assim mesmo.',
      },
      {
        kind: 'say',
        fen: '4k3/8/8/8/3Q4/8/8/4K3 w - - 0 1',
        text: 'A dama junta torre e bispo: anda reto e na diagonal. É a peça mais forte. Cuida bem dela.',
        arrows: [
          { from: 'd4', to: 'd8', color: 'idea' },
          { from: 'd4', to: 'h4', color: 'idea' },
          { from: 'd4', to: 'h8', color: 'idea' },
          { from: 'd4', to: 'a7', color: 'idea' },
        ],
      },
      {
        kind: 'say',
        fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1',
        text: 'O peão só anda pra frente, uma casa por vez. No primeiro lance dele, pode andar duas.',
        arrows: [
          { from: 'e2', to: 'e3', color: 'good' },
          { from: 'e2', to: 'e4', color: 'idea' },
        ],
      },
      {
        kind: 'play',
        fen: '4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1',
        text: 'Mas atenção: o peão captura na diagonal. Tem um peão preto em d5. Captura.',
        expect: ['exd5'],
        hint: 'Seu peão de e4 captura uma casa na diagonal, em d5.',
        successText: 'Perfeito. Anda reto, captura torto. Esse é o peão.',
      },
      {
        kind: 'say',
        fen: '4k3/8/8/8/4K3/8/8/8 w - - 0 1',
        text: 'Por último, o rei: uma casa pra qualquer lado. Ele é devagar, mas é o dono do jogo. Perdeu o rei, perdeu a partida.',
        squares: ['d5', 'e5', 'f5', 'd4', 'f4', 'd3', 'e3', 'f3'].map((square) => ({ square, color: 'idea' as const })),
      },
    ],
  },
  {
    id: 'controle-do-centro',
    professorId: 'tio-guilherme',
    title: 'Controle do centro',
    summary: 'Por que todo mundo começa pelo meio do tabuleiro.',
    concept: 'Controle do centro',
    minutes: 3,
    xp: 30,
    steps: [
      {
        kind: 'say',
        fen: START,
        text: 'Essas quatro casas são o centro. Quem manda aqui, manda no jogo.',
        squares: ['e4', 'd4', 'e5', 'd5'].map((square) => ({ square, color: 'idea' as const })),
      },
      {
        kind: 'say',
        text: 'Uma peça no centro alcança o tabuleiro inteiro. Na beirada, ela fica meio perdida.',
        squares: ['e4', 'd4', 'e5', 'd5'].map((square) => ({ square, color: 'idea' as const })),
      },
      {
        kind: 'play',
        text: 'Comece ocupando o centro: avance o peão do rei duas casas, até e4.',
        expect: ['e4'],
        hint: 'Toque no peão de e2 e depois na casa e4.',
        successText: 'Isso. Peão no centro, e de quebra abriu caminho pro bispo e pra dama.',
        reply: 'e5',
      },
      {
        kind: 'play',
        text: 'As pretas fizeram igual. Agora traga o cavalo pra f3: ele entra no jogo já atacando o peão de e5.',
        expect: ['Nf3'],
        hint: 'O cavalo de g1 pula para f3.',
        successText: 'Cavalo em f3: desenvolve e ataca ao mesmo tempo.',
        reply: 'Nc6',
        squares: [{ square: 'e5', color: 'warn' }],
      },
      {
        kind: 'say',
        text: 'Viu? Em dois lances você tem peão no centro e peça ativa. É assim que se começa uma partida.',
        arrows: [{ from: 'f3', to: 'e5', color: 'good' }],
      },
    ],
  },
  {
    id: 'desenvolvimento-e-roque',
    professorId: 'tio-guilherme',
    title: 'Desenvolvimento e rei seguro',
    summary: 'Peças pra fora, rei guardado.',
    concept: 'Desenvolvimento e segurança do rei',
    minutes: 3,
    xp: 30,
    steps: [
      {
        kind: 'say',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
        text: 'Desenvolver é tirar as peças da casa inicial e botar pra trabalhar. Cavalos e bispos primeiro.',
      },
      {
        kind: 'play',
        text: 'Coloque o bispo em c4. De lá ele mira o ponto mais fraco das pretas: f7.',
        expect: ['Bc4'],
        hint: 'O bispo de f1 vai pela diagonal até c4.',
        successText: 'Boa. Repara que f7 só é defendido pelo rei.',
        reply: 'Bc5',
        squares: [{ square: 'f7', color: 'bad' }],
      },
      {
        kind: 'say',
        text: 'Agora olha seu rei. Ainda está no meio, e o meio é onde a briga acontece.',
        squares: [{ square: 'e1', color: 'warn' }],
      },
      {
        kind: 'play',
        text: 'Faça o roque: o rei vai pra g1 e a torre pula pro lado dele.',
        expect: ['O-O'],
        hint: 'Toque no rei e depois na casa g1.',
        successText: 'Rei guardado, torre no jogo. Dois problemas resolvidos num lance só.',
        reply: 'Nf6',
      },
      {
        kind: 'say',
        text: 'Centro, desenvolvimento, roque. Faz isso em toda partida e você já sai na frente de muita gente.',
      },
    ],
  },

  // ───────────── Tio João · Estratégia ─────────────
  {
    id: 'estrutura-de-peoes',
    professorId: 'tio-joao',
    title: 'Estrutura de peões',
    summary: 'Dobrado, isolado, passado. Aprenda a ler os peões.',
    concept: 'Estrutura de peões',
    minutes: 3,
    xp: 40,
    steps: [
      {
        kind: 'say',
        fen: '6k1/pp3ppp/8/3P4/8/2P5/P1P3PP/6K1 w - - 0 1',
        text: 'Peão não volta. Cada avanço é pra sempre, então a estrutura conta a história da partida.',
      },
      {
        kind: 'say',
        text: 'Dois peões na mesma coluna são peões dobrados. Um atrapalha o outro.',
        squares: [
          { square: 'c2', color: 'warn' },
          { square: 'c3', color: 'warn' },
        ],
      },
      {
        kind: 'say',
        text: 'Esse em a2 está isolado: não tem peão vizinho pra defender. Vira alvo.',
        squares: [{ square: 'a2', color: 'bad' }],
      },
      {
        kind: 'say',
        text: 'E esse aqui é um peão passado. Nenhum peão preto consegue parar ele. Vale ouro.',
        squares: [{ square: 'd5', color: 'good' }],
        arrows: [{ from: 'd5', to: 'd8', color: 'good' }],
      },
      {
        kind: 'play',
        text: 'Peão passado tem que andar. Avance.',
        expect: ['d6'],
        hint: 'Empurre o peão de d5 para d6.',
        successText: 'Cada casa que ele avança, as pretas se preocupam mais.',
        reply: 'Kf8',
      },
      {
        kind: 'say',
        text: 'Antes de trocar ou avançar um peão, pense em como a estrutura fica depois. Esse é o hábito.',
      },
    ],
  },
  {
    id: 'torre-na-coluna-aberta',
    professorId: 'tio-joao',
    title: 'Torre na coluna aberta',
    summary: 'Onde a torre rende mais.',
    concept: 'Posicionamento',
    minutes: 2,
    xp: 40,
    steps: [
      {
        kind: 'say',
        fen: 'r5k1/ppp2ppp/8/8/8/8/PPP2PPP/R5K1 w - - 0 1',
        text: 'Coluna aberta é coluna sem peões. Pra torre, é uma estrada livre.',
        arrows: [
          { from: 'd1', to: 'd8', color: 'idea' },
          { from: 'e1', to: 'e8', color: 'idea' },
        ],
      },
      {
        kind: 'play',
        text: 'Sua torre está encostada no canto. Leve ela para a coluna d.',
        expect: ['Rd1'],
        hint: 'Torre de a1 para d1.',
        successText: 'Quem ocupa a coluna aberta primeiro costuma ficar com ela.',
        reply: 'h6',
      },
      {
        kind: 'play',
        text: 'Agora invada. A sétima fileira é onde moram os peões deles.',
        expect: ['Rd7'],
        hint: 'Suba a torre até d7.',
        successText: 'Torre na sétima ataca tudo de uma vez. As pretas vão passar o resto do jogo se defendendo.',
        squares: [
          { square: 'c7', color: 'bad' },
          { square: 'b7', color: 'bad' },
          { square: 'f7', color: 'bad' },
        ],
      },
      {
        kind: 'say',
        text: 'Peça ativa vale mais que peça parada. Pergunte sempre: qual das minhas peças está fazendo menos?',
      },
    ],
  },
  {
    id: 'quando-trocar',
    professorId: 'tio-joao',
    title: 'Trocar ou não trocar',
    summary: 'Com vantagem, simplifique.',
    concept: 'Troca de peças',
    minutes: 2,
    xp: 40,
    steps: [
      {
        kind: 'say',
        fen: '3q1rk1/5pp1/7p/8/8/5N2/3Q1PPP/3R2K1 w - - 0 1',
        text: 'Você tem um cavalo a mais. Como transformar isso em vitória? Simplificando.',
        squares: [{ square: 'f3', color: 'good' }],
      },
      {
        kind: 'play',
        text: 'Comece trocando as damas.',
        expect: ['Qxd8'],
        hint: 'Sua dama captura a dama preta em d8.',
        successText: 'Sem as damas, as pretas perdem a chance de te dar susto.',
        reply: 'Rxd8',
      },
      {
        kind: 'play',
        text: 'Agora as torres.',
        expect: ['Rxd8+'],
        hint: 'Torre captura torre em d8.',
        successText: 'Sobrou seu cavalo contra nada. O resto é técnica.',
        reply: 'Kh7',
      },
      {
        kind: 'say',
        text: 'Na frente em material: troque peças. Atrás: evite trocas e complique o jogo.',
      },
    ],
  },

  // ───────────── Tio Renan · Tática ─────────────
  {
    id: 'garfo',
    professorId: 'tio-renan',
    title: 'Garfo',
    summary: 'Uma peça, dois alvos.',
    concept: 'Garfo',
    minutes: 2,
    xp: 50,
    steps: [
      {
        kind: 'say',
        fen: 'r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1',
        text: 'Garfo é atacar duas peças com uma só. O adversário só consegue salvar uma.',
      },
      {
        kind: 'say',
        text: 'Rei em e8, torre em a8. Existe uma casa de onde seu cavalo ataca os dois.',
        squares: [
          { square: 'e8', color: 'bad' },
          { square: 'a8', color: 'bad' },
        ],
      },
      {
        kind: 'play',
        text: 'Acha a casa. Vai.',
        expect: ['Nc7+'],
        hint: 'Procure a casa c7.',
        successText: 'Xeque! O rei é obrigado a sair...',
        reply: 'Kf7',
      },
      {
        kind: 'play',
        text: '...e a torre ficou pra trás. Pega.',
        expect: ['Nxa8'],
        hint: 'O cavalo de c7 captura em a8.',
        successText: 'Uma torre de graça. Isso é um garfo.',
      },
      {
        kind: 'say',
        text: 'O cavalo é o rei do garfo, mas dama, bispo e até peão também fazem. Fica de olho em peça solta.',
      },
    ],
  },
  {
    id: 'cravada',
    professorId: 'tio-renan',
    title: 'Cravada',
    summary: 'A peça que não pode sair do lugar.',
    concept: 'Cravada',
    minutes: 2,
    xp: 50,
    steps: [
      {
        kind: 'say',
        fen: '6k1/6pp/8/3q4/8/1P6/6PP/5BK1 w - - 0 1',
        text: 'Cravada é quando uma peça não pode sair do lugar porque atrás dela tem algo mais valioso.',
      },
      {
        kind: 'say',
        text: 'A dama preta e o rei estão na mesma diagonal. Isso é um convite.',
        squares: [
          { square: 'd5', color: 'warn' },
          { square: 'g8', color: 'bad' },
        ],
      },
      {
        kind: 'play',
        text: 'Coloque uma peça nessa diagonal.',
        expect: ['Bc4'],
        hint: 'Seu bispo chega em c4.',
        successText: 'Cravada! Se a dama sair da diagonal, o rei fica em xeque. Ela não pode fugir.',
        reply: 'Qxc4',
      },
      {
        kind: 'play',
        text: 'Ela tomou o bispo por desespero. Recapture.',
        expect: ['bxc4'],
        hint: 'O peão de b3 captura em c4.',
        successText: 'Dama por bispo. Negócio fechado.',
      },
      {
        kind: 'say',
        text: 'Viu peça importante alinhada com o rei? Para e procura a cravada.',
      },
    ],
  },
  {
    id: 'ataque-descoberto',
    professorId: 'tio-renan',
    title: 'Ataque descoberto',
    summary: 'Sai uma peça da frente, a de trás ataca.',
    concept: 'Ataque descoberto',
    minutes: 2,
    xp: 50,
    steps: [
      {
        kind: 'say',
        fen: '6k1/3q1ppp/8/8/8/3B4/5PPP/3R2K1 w - - 0 1',
        text: 'Ataque descoberto: você tira uma peça da frente e a de trás ataca. Duas ameaças num lance só.',
      },
      {
        kind: 'say',
        text: 'Sua torre mira a dama preta, mas o bispo está no caminho. E se ele sair dando xeque?',
        squares: [{ square: 'd3', color: 'idea' }],
        arrows: [{ from: 'd1', to: 'd7', color: 'warn' }],
      },
      {
        kind: 'play',
        text: 'Qual lance do bispo dá xeque?',
        expect: ['Bxh7+'],
        hint: 'Tome o peão de h7 com o bispo.',
        successText: 'Xeque do bispo e a torre aberta contra a dama. Não dá pra resolver os dois.',
        reply: 'Kxh7',
      },
      {
        kind: 'play',
        text: 'Ele pegou o bispo. Agora cobra.',
        expect: ['Rxd7'],
        hint: 'A torre captura a dama em d7.',
        successText: 'Dama no bolso. Bispo por dama é troca que eu faço todo dia.',
      },
      {
        kind: 'say',
        text: 'Sempre que duas peças suas estiverem na mesma linha, pergunta: o que acontece se a da frente sair?',
      },
    ],
  },

  // ───────────── Tio Marcão · Avançado ─────────────
  {
    id: 'mate-da-escada',
    professorId: 'tio-marcao',
    title: 'Finais: o mate da escada',
    summary: 'Duas torres contra rei. Técnica pura.',
    concept: 'Finais',
    minutes: 2,
    xp: 60,
    steps: [
      {
        kind: 'say',
        fen: '7k/8/8/8/8/8/R7/1R4K1 w - - 0 1',
        text: 'Final de jogo é técnica. Com duas torres contra rei sozinho, o mate é mecânico.',
      },
      {
        kind: 'say',
        text: 'Uma torre fecha uma fileira. A outra dá xeque na seguinte. O rei vai sendo empurrado.',
        arrows: [{ from: 'a2', to: 'a7', color: 'idea' }],
      },
      {
        kind: 'play',
        text: 'O rei preto já está na última fileira. Tranque a sétima.',
        expect: ['Ra7', 'Rb7'],
        hint: 'Leve a torre de a2 para a7.',
        successText: 'Agora ele só tem a oitava fileira.',
        reply: 'Kg8',
      },
      {
        kind: 'play',
        text: 'Feche a conta.',
        expect: ['Rb8#', 'Ra8#'],
        hint: 'A outra torre dá xeque na oitava fileira.',
        successText: 'Xeque-mate. Sem pressa, sem drama.',
      },
      {
        kind: 'say',
        text: 'Decore o desenho, não os lances. Uma tranca, a outra dá xeque.',
      },
    ],
  },
  {
    id: 'sacrificio',
    professorId: 'tio-marcao',
    title: 'Sacrifício',
    summary: 'Dar material pra ganhar o rei.',
    concept: 'Sacrifícios',
    minutes: 3,
    xp: 60,
    steps: [
      {
        kind: 'say',
        fen: '5rk1/6p1/6P1/8/8/8/4Q3/6KR w - - 0 1',
        text: 'Sacrificar é dar material pra ganhar algo maior. Aqui, o prêmio é o rei.',
      },
      {
        kind: 'say',
        text: 'Seu peão em g6 tira as casas do rei preto. Falta a dama chegar na coluna h. A torre está no caminho.',
        squares: [
          { square: 'g6', color: 'good' },
          { square: 'h7', color: 'idea' },
        ],
      },
      {
        kind: 'play',
        text: 'Entregue a torre. Com xeque.',
        expect: ['Rh8+'],
        hint: 'Torre de h1 até h8.',
        successText: 'Ele é obrigado a aceitar.',
        reply: 'Kxh8',
      },
      {
        kind: 'play',
        text: 'Agora a dama entra na coluna h com xeque.',
        expect: ['Qh5+', 'Qh2+'],
        hint: 'A dama chega em h5 pela diagonal.',
        successText: 'O rei volta pra g8. Não tem outra casa.',
        reply: 'Kg8',
      },
      {
        kind: 'play',
        text: 'Termine.',
        expect: ['Qh7#'],
        hint: 'Dama em h7, apoiada pelo peão.',
        successText: 'Mate. Uma torre a menos e a partida ganha. Material não é tudo.',
      },
      {
        kind: 'say',
        text: 'Antes de sacrificar, calcule até o fim. Se a linha é forçada, o material não importa.',
      },
    ],
  },
  {
    id: 'calculo',
    professorId: 'tio-marcao',
    title: 'Cálculo: lances forçados',
    summary: 'Xeques, capturas, ameaças. Nessa ordem.',
    concept: 'Cálculo',
    minutes: 3,
    xp: 60,
    steps: [
      {
        kind: 'say',
        fen: 'r5rk/5p1p/5R2/4B3/8/8/7P/7K w - - 0 1',
        text: 'Calcular é olhar primeiro os lances que obrigam uma resposta: xeques, capturas e ameaças.',
      },
      {
        kind: 'say',
        text: 'Seu bispo mira o rei preto, mas a sua própria torre está na frente. Se ela sair, é xeque.',
        arrows: [{ from: 'e5', to: 'h8', color: 'warn' }],
        squares: [{ square: 'f6', color: 'idea' }],
      },
      {
        kind: 'play',
        text: 'A torre pode sair pra várias casas. Só uma ganha tempo atacando outra peça.',
        expect: ['Ra6+'],
        hint: 'Vá para a6: xeque descoberto e ataque na torre de a8.',
        successText: 'Xeque descoberto com ameaça. As pretas só conseguem cobrir.',
        reply: 'f6',
      },
      {
        kind: 'play',
        text: 'Elas bloquearam com o peão. Continue forçando.',
        expect: ['Bxf6+'],
        hint: 'O bispo captura em f6, de novo com xeque.',
        successText: 'Outra resposta única: a torre tem que entrar na frente.',
        reply: 'Rg7',
      },
      {
        kind: 'play',
        text: 'A torre de g7 está cravada. O que isso libera?',
        expect: ['Rxa8#'],
        hint: 'A torre de a6 captura em a8. Ninguém pode bloquear.',
        successText: 'Mate em três, sem dar chance. Isso é calcular.',
      },
      {
        kind: 'say',
        text: 'Em cada lance, as pretas tinham uma resposta só. Linha forçada é linha que dá pra calcular até o fim.',
      },
    ],
  },
];

export function findTeachModule(id: string): TeachModule | undefined {
  return TEACH_MODULES.find((m) => m.id === id);
}

export function teachModulesOf(professorId: string): TeachModule[] {
  return TEACH_MODULES.filter((m) => m.professorId === professorId);
}
