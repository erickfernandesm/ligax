# Publicar na Cloudflare (plano gratuito)

A plataforma roda na Cloudflare como um **Worker** (o site e a API) ligado a um banco **D1** (contas, progresso, aulas e partidas online). O build acontece nos servidores da Cloudflare, a partir do GitHub: não precisa instalar nada na sua máquina.

```
GitHub (código)  →  Cloudflare Workers Builds (compila)  →  Worker + D1 (no ar)
```

## Passo a passo

### 1. Código no GitHub

1. Crie uma conta em https://github.com (se ainda não tiver).
2. Crie um repositório **privado** e **vazio** chamado `ligax` (sem README, sem .gitignore).
3. Na pasta do projeto:

```bash
git remote add origin https://github.com/erickfernandesm/ligax.git
git push -u origin main
```

Na primeira vez o Windows abre uma janela para você entrar no GitHub.

### 2. Conta na Cloudflare

Crie uma conta gratuita em https://dash.cloudflare.com.

O banco D1 não precisa ser criado à mão: o primeiro deploy cria o banco `ligax` sozinho, e a tabela é criada no primeiro acesso.

### 3. Ligar o repositório à Cloudflare

1. No painel: **Workers & Pages → Create → Import a repository**.
2. Autorize o GitHub e escolha `ligax`.
3. Preencha:

| Campo | Valor |
| --- | --- |
| Project name | `ligax-xadrez` (tem que ser igual ao `name` do `wrangler.jsonc`) |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx wrangler deploy` |

4. **Save and Deploy**. O primeiro build leva alguns minutos.

A versão do Node vem do arquivo `.nvmrc` (22). A partir daqui, todo `git push` publica uma versão nova sozinho.

### 4. Primeiro acesso

1. Abra o endereço que a Cloudflare mostrar (`https://ligax-xadrez.SEU-SUBDOMINIO.workers.dev`).
2. Crie a sua conta. **A primeira conta criada vira admin.**
3. Para usar o domínio da Liga X: no Worker, **Settings → Domains & Routes → Add → Custom Domain**.

## O que muda em relação a rodar na sua máquina

| | Na sua máquina | Na Cloudflare |
| --- | --- | --- |
| Banco | arquivo `data/ligax.json` | D1 |
| Vídeo das aulas | YouTube, link ou arquivo enviado | YouTube ou link (sem disco para guardar arquivos) |
| Contas | as do arquivo local | começam do zero no D1 |

As contas criadas na sua máquina não vão junto: o banco da Cloudflare começa vazio.

## Limites do plano gratuito

- **100 mil requisições por dia** ao Worker (arquivos estáticos, como imagens e a engine de xadrez, não contam). Cada jogador numa partida online faz uma consulta a cada 1,5 s enquanto a aba está aberta: uma hora de partida entre duas pessoas gasta perto de 5 mil. Quando o limite estoura, o site responde com erro até a virada do dia (UTC).
- **Tempo de processamento** de 10 ms de CPU por requisição. Criar conta e entrar são as operações mais pesadas (cálculo da senha). Se aparecer "Error 1102" nessas telas, é esse limite, e a saída é o plano pago (US$ 5/mês).
- **D1**: 5 GB e 5 milhões de leituras por dia. Folgado para o tamanho atual.

## Se o build falhar

- **"Worker exceeded the size limit of 3 MiB"**: o plano gratuito limita o tamanho do código. Me mande o log.
- **Erro pedindo `database_id`**: crie o banco pelo painel (**Storage & Databases → D1 → Create**, nome `ligax`), copie o Database ID e acrescente `"database_id": "<id>"` no bloco `d1_databases` do `wrangler.jsonc`.
- **Página abre, mas dá erro ao criar conta**: abra o Worker no painel, **Logs → Live**, repita a ação e veja a mensagem.

## Variáveis (opcional)

Em `wrangler.jsonc`, dentro de `vars`:

- `LIGAX_ADMIN_EMAILS`: e-mails que viram admin ao criar a conta, separados por vírgula.
