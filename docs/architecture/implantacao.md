# Implantação do VisionChef na Vercel e no Supabase

Este roteiro ativa o backend Node da Vercel, a autenticação gerenciada pelo Supabase e a limitação de tentativas compartilhada no PostgreSQL. O build local, a publicação das migrações/funções e o deploy são etapas distintas.

## 1. Variáveis da Vercel

No projeto `sync-solucoes` da Vercel, abra **Settings → Environment Variables** e configure os valores abaixo para **Production** e **Preview**. `HTTP_PORT` só é usado pelo servidor de desenvolvimento local, não precisa ser cadastrado na Vercel.

| Variável | Valor / regra |
| --- | --- |
| `VISIONCHEF_SUPABASE_URL` | URL HTTPS do projeto Supabase `visionchef` |
| `VISIONCHEF_SUPABASE_PUBLISHABLE_KEY` | Chave `sb_publishable_` desse mesmo projeto |
| `JWT_SECRET_KEY` | Segredo aleatório local com ao menos 32 caracteres; use o mesmo valor no Supabase Edge Function Secrets |
| `JWT_ALGORITHM` | `HS256` |
| `JWT_EXPIRATION_MINUTES` | `10080` (ou `1440`; o backend aplica no mínimo `JWT_SESSION_DAYS` = 7 dias por inatividade) |
| `JWT_SESSION_DAYS` | Opcional, padrão `7` (1 a 30 dias de permanência automática por inatividade) |
| `JWT_MAX_SESSION_DAYS` | Opcional, padrão `30` (teto absoluto de renovação deslizante sem novo login) |
| `JWT_COOKIE_NAME` | `access_token` |
| `JWT_COOKIE_SECURE` | `true` em todos os ambientes Vercel com HTTPS |
| `AUTH_LOGIN_LIMIT` | `5` |
| `AUTH_SIGNUP_LIMIT` | `3` |
| `AUTH_CONFIRMATION_LIMIT` | `3` |
| `AUTH_RATE_WINDOW_SECONDS` | `900` |
| `AUTH_BLOCK_SECONDS` | `900` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURITY` | Host SMTP, porta 465/587 e modo `ssl`/`starttls`, usados somente pela API Node ao enviar confirmação opcional. |
| `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD` | Remetente e credenciais SMTP privadas; não usar senha principal de conta de e-mail quando o provedor oferece senha de aplicativo. |

Use `.env.example` apenas como modelo. Não cole o segredo em chats, Git, arquivos públicos ou variáveis `VITE_*`. A produção exige novo deploy depois de alterar variáveis. O valor local `JWT_COOKIE_SECURE=false` é apenas para HTTP em `127.0.0.1`.

## 2. Publicar no Supabase

Na raiz do projeto, confira se a CLI está vinculada a `dqztfllfillntrewutrr` (projeto `visionchef`) antes de aplicar qualquer alteração:

```powershell
npx supabase link --project-ref dqztfllfillntrewutrr
npx supabase db push --dry-run --remote
npx supabase db push --remote
npx supabase functions deploy login-usuario --project-ref dqztfllfillntrewutrr
npx supabase functions deploy limitar-autenticacao --project-ref dqztfllfillntrewutrr
npx supabase functions deploy verificacao-email --project-ref dqztfllfillntrewutrr
```

O dry-run deve listar apenas migrações ainda pendentes para o VisionChef. Interrompa se o destino mostrar outro projeto, como `Cesta do Vale`. Na área de Secrets das Edge Functions, configure:

- `JWT_SECRET_KEY`: o mesmo segredo cadastrado na Vercel.
- `VISIONCHEF_LOGIN_ORIGINS`: `https://sync-solucoes.vercel.app` (origem completa, sem barra final).

O mesmo segredo SMTP privado deve ser configurado na Vercel para a confirmação opcional enviada pelo backend. No Supabase, o SMTP personalizado continua sendo usado pelos e-mails nativos, incluindo recuperação de senha.

A função de login por nome recebe somente chamadas com HMAC do backend; a função do limitador segue o mesmo mecanismo. Elas ficam com verificação JWT desativada porque validam essa assinatura HMAC própria. Nunca exponha `JWT_SECRET_KEY` ou uma chave administrativa ao navegador.

## 3. Build e deploy

O projeto Vercel usa a raiz do repositório, framework `Other`, comando `npm run build` e saída `dist/`. O `vercel.json` redireciona `/estoque` → `/estoque/` e `/equipe` → `/equipe/`, e reescreve todas as rotas `/api/:rota*` para a função Node única em `api/index.js` (com query `__rota`), evitando `404` e redirecionamentos `308` em chamadas `POST`. Os endpoints `GET /api/health` e `GET /api/health/ready` servem para checagem de saúde pós-deploy. O procedimento completo de release, rollback e rotação de segredos está em [runbook.md](../operations/runbook.md).

Depois de configurar os valores e confirmar migrações/funções, publique usando o fluxo de deploy escolhido para o projeto (`npx vercel --prod --yes`). Para conferir localmente apenas a compilação, execute `npm.cmd run build`; isso não publica código nem modifica o Supabase.

## 4. Auth, e-mail e validação

Em **Authentication → URL Configuration**, mantenha `https://sync-solucoes.vercel.app` como Site URL e como URL autorizada. Em **Sign In / Providers**, mantenha cadastro por e-mail ligado. O fluxo de confirmação opcional próprio só funciona depois de publicar a migração `20261124000900`, a função `verificacao-email` e a API Node com variáveis SMTP na Vercel. Só então desligue **Confirm email** no Supabase Auth; até essa implantação, mantenha o estado atual para evitar bloquear cadastros ou entrar em conflito com o comportamento publicado. Configure SMTP personalizado no Supabase para recuperação de senha; os limites de envio padrão não servem como e-mail de produção.

O cadastro cria uma conta Auth e nome único, mas não concede vínculo com restaurante. O dono precisa liberar o vínculo separadamente. A recuperação deve voltar à origem autorizada da Sync.

Após a implantação, valide: login por nome e e-mail; tela de login com somente credenciais e recuperação; cookie `HttpOnly`, `SameSite=Strict` e `Secure`; expiração/renovação e saída; cadastro que abre a área da conta; solicitação de confirmação dentro da conta e consumo único do link; recuperação; bloqueio depois do limite; isolamento por restaurante; e recusa das funções Edge quando a assinatura interna é inválida. Confirme que o estoque continua inacessível sem vínculo ativo.

## 5. Situação atual e próximos passos

- **Já publicado e validado em produção (`visionchef` / `sync-solucoes.vercel.app`):** migrações `001`–`012`, Edge Functions (`login-usuario`, `limitar-autenticacao`, `verificacao-email` com `acao: 'existe'`), recuperação de senha via Supabase Auth SMTP, verificação de e-mail inexistente (`404`), e confirmação opcional ponta a ponta via Vercel/Nodemailer.
- **Pronto para o próximo release:** migração `20261124001300_gestao_equipe.sql`, tela `/equipe/`, endpoints `/api/health`, `/api/health/ready` e `/api/equipe/*`, pipeline CI `.github/workflows/ci.yml`, Argon2id local (`scripts/senhas.mjs`) e refinamento do remetente de confirmação.
- **Antes do lançamento comercial (Bloco 5):** separar projeto Supabase para Preview, ensaiar backup/restore conforme [runbook.md](../operations/runbook.md), e avaliar planos comerciais + SMTP transacional dedicado.
