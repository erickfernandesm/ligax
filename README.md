# Liga X Xadrez

Plataforma de xadrez da Liga X: **jogar, aprender, evoluir**. Next.js + React + TypeScript + Tailwind, pensada primeiro para celular.

## Rodar

```bash
npm install
npm run dev          # http://localhost:3000  (use `npm run dev -- -p 3210` se a porta estiver ocupada)
npm run build && npm start
```

Requer Node 20+. O TypeScript fica fixado na série 5.x (o Next 15 não funciona com o TypeScript 7).

## O que tem

| Área | Rota | O que faz |
| --- | --- | --- |
| Entrar / criar conta | (qualquer rota, sem sessão) | E-mail, senha e nick |
| Início | `/` | Nível, Score, próxima etapa da carreira, atalhos |
| Treinar | `/jogar` | Escolher adversário (4 bots) ou partida aleatória |
| Jogar com um amigo | `/amigo`, `/amigo/[código]` | Partida online por código/link, Score e ranking |
| Carreira | `/carreira` | Etapas contra cada bot |
| Partida | `/partida` | Jogo completo contra a engine |
| Modo Ensino | `/aprender`, `/ensino/[id]` | Professor conduz a lição no tabuleiro |
| Modo Desafio | `/desafios`, `/desafio/[id]` | Posições do Haroldo, grupos que destravam, desafio do dia |
| Aulas | `/aulas`, `/aulas/[id]`, `/professores/[id]` | Aulas em vídeo, com resumo e prática |
| Laboratório | `/laboratorio` | Editor de posições e análise com engine |
| Link compartilhado | `/posicao?p=...` | Posição aberta sem precisar de conta |
| Perfil | `/perfil` | Nível, Score, estatísticas, conquistas, ajustes |
| Painel | `/admin` | Professores: aulas e vídeos. Admins: também professores e permissões |

## Contas, nível e Score

- **Conta**: e-mail, senha (mínimo 8 caracteres) e nick único. A senha é guardada com `scrypt` + sal; a sessão fica num cookie `httpOnly`.
- **Nível (1 a 100)**: sobe com XP, e XP vem só de estudo: desafios resolvidos, aulas assistidas e lições do Modo Ensino. Partidas não dão XP. A curva fica em `src/content/progression.ts`.
- **Score**: só de partidas online contra outras pessoas (vitória +25, empate +10, derrota 0). Quem calcula é o servidor. Partidas com menos de 6 lances no total não pontuam.
- **Permissões**: `aluno`, `professor` (cria aulas e envia vídeos) e `admin` (também cadastra professores e define a permissão de cada conta em Painel → Contas).
- **Primeiro admin**: a primeira conta criada vira admin. Também dá para fixar por variável de ambiente: `LIGAX_ADMIN_EMAILS=fulano@email.com,outra@email.com`.
- **Aula é vídeo**: uma aula só pode ser publicada depois de ter vídeo (YouTube, arquivo enviado ou link direto). As aulas iniciais nascem como rascunho, esperando o vídeo.

## Arquitetura

```
assets/                 logo e, no futuro, caricaturas (fonte da verdade)
scripts/                sync de assets, validação de conteúdo, testes
src/
  core/                 regras de negócio em TypeScript puro (sem React, sem DOM)
    chess/              partida, FEN, material, marcações, busca de mate
    engine/             contrato ChessEngine, Stockfish (UCI), engine reserva em JS, bots
    progression/        XP, níveis, carreira, conquistas (funções puras)
    challenges/         avaliação de tentativas, grupos, desafio do dia
    domain/types.ts     entidades: User, Bot, Game, Challenge, Lesson, Professor...
  content/              tudo que é configurável: personagens, bots, níveis, desafios, lições, aulas
  server/               backend: banco em arquivo, contas e sessões, aulas, partidas online
  services/             cliente da API, auth, engine, mídia, compartilhamento, som
  stores/               estado da aplicação (zustand, persistido)
  hooks/                useChessGame, useBoardInput, useSound
  components/           ui, board (ChessBoard), characters, layout, progression
  features/             telas por domínio: game, friends, teaching, challenges, lessons, lab, admin
  app/                  rotas: (app) com navegação, (play) telas de tabuleiro, api/ o backend
```

`src/core` e `src/content` não dependem do navegador nem do servidor: as mesmas regras de xadrez validam os lances no cliente e na API. Num app React Native/Expo eles são reaproveitados como estão, falando com a mesma API.

Existe **um único tabuleiro** (`components/board/ChessBoard.tsx`), usado por Partida, Ensino, Desafio, Laboratório, Modo Professor e Análise. Ele não conhece regras: recebe a posição e avisa toques, arrastos e traços.

## Como mexer sem programar muito

**Trocar silhueta por caricatura.** Solte o arquivo em `assets/characters/<id>.png` e reinicie (`npm run dev`). Os ids são `tio-guilherme`, `tio-joao`, `tio-renan`, `tio-marcao` e `haroldo`. Nenhuma tela precisa mudar.

**Ajustar a força dos bots.** `src/content/bots.ts`. Os quatro usam a mesma engine; muda só `skillLevel`, `depth`, `moveTimeMs` e `blunderChance`.

**Novo bot ou personagem.** Um item em `src/content/characters.ts` e outro em `src/content/bots.ts`.

**Níveis, XP, Score e conquistas.** `src/content/progression.ts`.

**Desafios e lições do Modo Ensino.** `src/content/challenges.ts` e `src/content/teaching.ts`. Depois rode `npm run validate`: ele confere FEN, lances e se cada mate é mesmo forçado.

**Aulas e professores.** Pelo painel em `/admin` (aparece no Perfil de contas com permissão).

## Testes

```bash
npm run validate                 # consistência do conteúdo
npm test                         # regras de negócio e servidor, em arquivo e em D1 simulado (29 testes)
node scripts/e2e/routes.mjs      # todas as rotas em 8 resoluções (320 px até desktop)
node scripts/e2e/game.mjs        # partidas reais: vitória por mate, derrota, empate, XP
node scripts/e2e/friends.mjs     # cadastro, login e partida online entre duas contas
node scripts/e2e/features.mjs    # ensino, desafios, nível, aulas em vídeo, permissões, laboratório
```

Os testes `e2e` usam o Chrome instalado e esperam o app em `E2E_BASE` (padrão `http://localhost:3000`). Suba o servidor de teste com um banco separado: `LIGAX_DATA_DIR=/tmp/ligax-e2e LIGAX_ADMIN_EMAILS=admin@ligax.test npm run dev`.

## Publicar

Guia completo para a Cloudflare (plano gratuito, com banco D1): [DEPLOY-CLOUDFLARE.md](DEPLOY-CLOUDFLARE.md).

Em qualquer servidor Node com disco também funciona: `npm run build && npm start`.

## Servidor e dados

O backend roda dentro do próprio Next (`src/app/api` + `src/server`). Não precisa de nenhum serviço externo.

| O quê | Onde fica | Para escalar |
| --- | --- | --- |
| Contas, sessões, progresso, aulas, partidas online | `data/ligax.json` no Node, banco D1 na Cloudflare (`src/server/store.ts`) | tabelas próprias em `store.ts` |
| Vídeos enviados | `data/uploads` no Node. Na Cloudflare só link (YouTube ou direto) | bucket R2 em `/api/media` |
| Partida online | consulta a cada 1,5 s (`/api/matches/[id]`) | WebSocket/SSE |

Variáveis de ambiente opcionais: `LIGAX_DATA_DIR` (pasta dos dados), `LIGAX_ADMIN_EMAILS`, `LIGAX_MAX_UPLOAD_MB` (padrão 1024).

**Faça backup da pasta `data/`**: ela é o banco. Ainda não existe "esqueci minha senha" (precisa de um serviço de e-mail).

Para dois amigos jogarem de aparelhos diferentes, os dois precisam alcançar o mesmo servidor: publique a aplicação (`npm run build && npm start` num servidor Node) ou, em casa, acesse pelo IP da máquina na mesma rede.

## Licenças de terceiros

- **Stockfish.js** (engine dos bots e da análise): GPLv3. Roda isolado num Web Worker, a partir de `public/engine`. Vale revisar com quem cuida do jurídico antes de um lançamento comercial fechado.
- **Peças** (`public/pieces/cburnett`): desenho de Colin M.L. Burnett, licenças GPLv2+ / BSD / GFDL.
- **chess.js**: BSD-2-Clause.
