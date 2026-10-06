import type { Character } from '@/core/domain/types';

// Personagens da Liga X. Para cadastrar um novo, basta adicionar um item aqui.
// Caricaturas: solte o arquivo em /assets/characters/<id>.png — sem mexer em código.

export const CHARACTERS: Character[] = [
  {
    id: 'tio-guilherme',
    name: 'Tio Guilherme',
    role: 'Professor de Fundamentos',
    tagline: 'Sem pressa. Xadrez se aprende jogando.',
    description:
      'O primeiro adversário de quase todo mundo na Liga X. Joga solto, erra de vez em quando e comemora junto quando você acerta.',
    personality: ['Amigável', 'Paciente', 'Bom de conversa'],
    accent: '#81a44c',
    phrases: {
      greeting: ['Senta aí. Vamos jogar sem pressa.', 'Bora? Pode começar, eu espero.', 'Que bom te ver por aqui.'],
      thinking: ['Deixa eu ver...', 'Hmm, boa pergunta.', 'Calma, tô pensando.'],
      botCapture: ['Essa eu vou pegar, tá?', 'Opa, ficou solta.', 'Peguei. Fica de olho nas peças sem defesa.'],
      botCheck: ['Xeque! Cuida do rei.', 'Olha o rei aí.'],
      playerCapture: ['Boa captura!', 'Eita, essa eu não vi.', 'Tá certo, eu deixei solta.'],
      playerCheck: ['Opa, xeque em mim?', 'Boa! Me pegou desprevenido.'],
      botWins: ['Dessa vez deu pra mim. Joga outra?', 'Quase! Você tá melhorando.'],
      botLoses: ['Aí sim! Mereceu.', 'Ganhou bonito. Tá na hora de encarar o João.'],
      draw: ['Empate justo. Ninguém saiu perdendo.'],
    },
  },
  {
    id: 'tio-joao',
    name: 'Tio João',
    role: 'Professor de Estratégia',
    tagline: 'Cada peça no lugar certo.',
    description:
      'Não tem pressa de atacar. Vai melhorando a posição lance a lance até você perceber que ficou sem jogada boa.',
    personality: ['Estratégico', 'Calculista', 'Exigente na medida'],
    accent: '#2f8f9d',
    phrases: {
      greeting: ['Vamos ver como anda seu plano de jogo.', 'Presta atenção na posição, não só nas peças.'],
      thinking: ['Tem mais de um plano aqui...', 'Qual peça minha está pior?', 'Um momento.'],
      botCapture: ['Essa foi uma boa oportunidade.', 'Troca boa pra mim.', 'Peça mal colocada acaba assim.'],
      botCheck: ['Xeque. E agora seu rei tem que andar.', 'Xeque. Repara como suas peças estão longe.'],
      playerCapture: ['Certo. Essa eu te devia.', 'Aceito a troca.', 'Hmm. Bem visto.'],
      playerCheck: ['Xeque não é plano, mas esse incomodou.', 'Tudo bem, meu rei se vira.'],
      botWins: ['Foi a posição que ganhou, não eu.', 'Reveja onde suas peças ficaram presas.'],
      botLoses: ['Jogou com plano. Parabéns.', 'Você me apertou do começo ao fim.'],
      draw: ['Equilibrado. Nenhum dos dois cedeu.'],
    },
  },
  {
    id: 'tio-renan',
    name: 'Tio Renan',
    role: 'Professor de Tática',
    tagline: 'Piscou, perdeu.',
    description:
      'Joga pra frente o tempo todo. Qualquer peça solta vira alvo e qualquer descuido vira combinação.',
    personality: ['Agressivo', 'Rápido', 'Competitivo'],
    accent: '#d2572f',
    phrases: {
      greeting: ['Vai encarar? Então vem.', 'Espero que tenha aquecido.', 'Sem moleza hoje.'],
      thinking: ['Tem coisa aí...', 'Tô sentindo cheiro de tática.', 'Peraí que eu vi um negócio.'],
      botCapture: ['Deixou solta, eu levo.', 'Obrigado pelo presente.', 'Essa doeu, né?'],
      botCheck: ['Xeque! Corre.', 'Xeque. E vem mais.'],
      playerCapture: ['Tá, essa foi boa.', 'Opa. Agora ficou sério.', 'Vai ter troco.'],
      playerCheck: ['Ousado. Gostei.', 'Xeque em mim? Vamos ver até onde vai.'],
      botWins: ['Erro se paga à vista.', 'Volta quando quiser a revanche.'],
      botLoses: ['Respeito. Ganhou na raça.', 'Tá bom, tá bom. Você mereceu essa.'],
      draw: ['Empate? Da próxima eu resolvo.'],
    },
  },
  {
    id: 'tio-marcao',
    name: 'Tio Marcão',
    role: 'Professor Avançado',
    tagline: 'Pensa antes de mexer.',
    description:
      'O mais difícil da casa. Fala pouco, calcula muito e quase nunca devolve o que ganhou. Vencer o Marcão é pra contar pros outros.',
    personality: ['Preciso', 'Frio', 'Implacável'],
    accent: '#5a4b8c',
    phrases: {
      greeting: ['Pode começar.', 'Calma. Pensa antes de mexer.', 'Vamos ver o que você aprendeu.'],
      thinking: ['...', 'Calculando.', 'Interessante.'],
      botCapture: ['Previsto.', 'Isso estava no cálculo.', 'Um peão hoje, a partida amanhã.'],
      botCheck: ['Xeque.', 'Xeque. Conta quantas casas seu rei tem.'],
      playerCapture: ['Correto.', 'Boa jogada.', 'Você viu. Poucos veem.'],
      playerCheck: ['Bem calculado.', 'Certo. Continue.'],
      botWins: ['Reveja a partida. O erro foi antes do que você pensa.', 'Normal. Tenta de novo.'],
      botLoses: ['Partida limpa. Parabéns.', 'Hoje você calculou mais longe do que eu.'],
      draw: ['Empate. Você segurou bem.'],
    },
  },
  {
    id: 'haroldo',
    name: 'Haroldo',
    role: 'Haroldo',
    tagline: 'Aqui se joga pra evoluir.',
    description:
      'Aparece quando a coisa é importante: um nível novo, um desafio sério, uma conquista de verdade.',
    personality: ['Autoridade', 'Direto', 'Justo'],
    accent: '#bddb00',
    phrases: {
      greeting: ['Bem-vindo à Liga X.', 'Agora quero ver se você realmente aprendeu.'],
    },
  },
];

export const HAROLDO_ID = 'haroldo';

const byId = new Map(CHARACTERS.map((c) => [c.id, c]));

export function getCharacter(id: string): Character {
  const c = byId.get(id);
  if (!c) throw new Error(`Personagem desconhecido: ${id}`);
  return c;
}

export function findCharacter(id: string | undefined): Character | undefined {
  return id ? byId.get(id) : undefined;
}

/** Sorteia uma fala do personagem para um evento. */
export function pickPhrase(characterId: string, event: keyof Character['phrases'], rng = Math.random): string | null {
  const list = byId.get(characterId)?.phrases[event];
  if (!list || list.length === 0) return null;
  return list[Math.floor(rng() * list.length)];
}
