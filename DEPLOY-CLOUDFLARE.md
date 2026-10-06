# Publicar na Cloudflare (plano gratuito)

No ar em: https://ligax-xadrez.erickfernandesmazilao.workers.dev

A plataforma roda na Cloudflare como um **Worker** (o site e a API) ligado a um banco **D1** (contas, progresso, aulas e partidas online). O build acontece no GitHub Actions: não precisa instalar nada na máquina.

```
git push  →  GitHub Actions (testa e compila)  →  Worker + D1 (no ar)
```

## Como funciona

O arquivo `.github/workflows/deploy.yml` roda a cada `git push` na `main` (ou manualmente, em **Actions → Deploy → Run workflow**):

1. instala as dependências (`npm ci`, Node 22 pelo `.nvmrc`);
2. valida o conteúdo e roda os testes;
3. compila com o adaptador OpenNext (`npx opennextjs-cloudflare build`);
4. publica (`npx wrangler deploy`).

O banco D1 `ligax` foi criado pelo primeiro deploy, e a tabela é criada no primeiro acesso. Não há migração para rodar.

## Segredos do repositório

Em **Settings → Secrets and variables → Actions**:

| Segredo | O que é |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | token da API da Cloudflare com permissão de editar Workers e D1 |
| `CLOUDFLARE_ACCOUNT_ID` | id da conta (aparece na página inicial do painel) |

Para criar um token permanente: painel da Cloudflare → **My Profile → API Tokens → Create Token → Edit Cloudflare Workers**, acrescente **Account → D1 → Edit**, crie e cole o valor no segredo `CLOUDFLARE_API_TOKEN`.

## Domínio próprio

No painel, abra o Worker `ligax-xadrez` → **Settings → Domains & Routes → Add → Custom Domain**.

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

## Se o deploy falhar

Abra a aba **Actions** do repositório e veja o passo que ficou vermelho.

- **Authentication error no passo "Publicar na Cloudflare"**: o `CLOUDFLARE_API_TOKEN` expirou ou não tem permissão. Crie um token novo (seção acima).
- **"Worker exceeded the size limit of 3 MiB"**: o plano gratuito limita o tamanho do código (hoje são cerca de 1,2 MiB).
- **Página abre, mas dá erro ao criar conta**: no painel, abra o Worker, **Logs → Live**, repita a ação e veja a mensagem.

## Variáveis (opcional)

Em `wrangler.jsonc`, dentro de `vars`:

- `LIGAX_ADMIN_EMAILS`: e-mails que viram admin ao criar a conta, separados por vírgula.
