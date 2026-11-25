# VisionChef — Runbook operacional (F07 / F09)

**Atualizado em:** 25/11/2026  
**Produção:** `https://sync-solucoes.vercel.app` (Vercel `cesta-do-vale/sync`)  
**Banco / Auth:** Supabase projeto `visionchef` (`dqztfllfillntrewutrr`)

---

## 1. Checagem rápida de saúde (Smoke Check)

1. **Liveness da API:** `GET https://sync-solucoes.vercel.app/api/health`
   - Esperado: `HTTP 200` com `{"status":"ok","servico":"visionchef-api","runtime":"node",...}`.
2. **Readiness (configuração + Supabase Auth):** `GET https://sync-solucoes.vercel.app/api/health/ready`
   - Esperado: `HTTP 200` com `{"status":"ready","dependencias":{"configuracao":"ok","auth":"ok"}}`.
   - Se `503` com `configuracao: "erro"`, conferir variáveis de ambiente na Vercel.
   - Se `503` com `auth: "indisponivel"`, verificar status do projeto Supabase `visionchef`.
3. **Rotas de interface:**
   - `/` (landing Sync + login) → `200`
   - `/estoque` → `308` para `/estoque/` (`200`)
   - `/equipe` → `308` para `/equipe/` (`200`)
4. **Logs em tempo real na Vercel:**
   ```powershell
   npx vercel logs --deployment sync-solucoes.vercel.app --since 15m
   ```

---

## 2. Procedimento padrão de release

Executar sempre na raiz do repositório (`C:\Users\fabio\Desktop\Sync`):

```powershell
# 1. Validar testes e build localmente
npm.cmd test
npm.cmd run build

# 2. Conferir e aplicar novas migrações apenas no projeto visionchef
npx supabase db push --dry-run --remote
npx supabase db push --remote

# 3. Se houve mudança em Edge Functions, publicar individualmente
npx supabase functions deploy login-usuario --project-ref dqztfllfillntrewutrr
npx supabase functions deploy limitar-autenticacao --project-ref dqztfllfillntrewutrr
npx supabase functions deploy verificacao-email --project-ref dqztfllfillntrewutrr

# 4. Versionar no GitHub (dispara a CI em .github/workflows/ci.yml)
git status
git add -A
git commit -m "descreva a entrega"
git push

# 5. Publicar produção na Vercel (o deploy automático Git está desativado neste projeto)
npx vercel --prod --yes
```

---

## 3. Rollback

### 3.1 Rollback da aplicação (Vercel)
1. Listar deployments recentes:
   ```powershell
   npx vercel ls
   ```
2. Promover o deployment estável anterior (ou usar **Deployments → Instant Rollback** no painel da Vercel):
   ```powershell
   npx vercel promote <url-do-deployment-anterior>
   ```
3. Revalidar `/api/health`, `/api/health/ready` e `/api/auth/session`.

### 3.2 Rollback de banco de dados (Supabase)
- **Regra de ouro:** migrações SQL no VisionChef são preferencialmente aditivas e retrocompatíveis. Nunca executar `DROP TABLE` ou alterar colunas em uso sem janela planejada.
- Se uma RPC nova apresentar erro em produção, criar uma nova migração corretiva (`20261124001400_...`) restaurando a definição anterior da função e aplicar via `npx supabase db push --remote`.

---

## 4. Rotação de segredos

### 4.1 Rotação de `JWT_SECRET_KEY`
1. Gerar novo segredo aleatório de 64 caracteres hexadecimais localmente (nunca colar em chat ou Git):
   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```
2. Atualizar `JWT_SECRET_KEY` simultaneamente em:
   - **Vercel** → Settings → Environment Variables (`Production` e `Preview`).
   - **Supabase** → Edge Functions → Secrets (`JWT_SECRET_KEY`).
3. Executar novo deploy na Vercel (`npx vercel --prod --yes`).
4. **Efeito esperado:** todas as sessões anteriores expiram automaticamente e os usuários precisam entrar novamente.

### 4.2 Rotação da senha de aplicativo SMTP
1. Gerar nova senha de aplicativo no provedor SMTP.
2. Atualizar `SMTP_PASSWORD` na **Vercel** (para confirmação opcional) e em **Supabase → Authentication → SMTP Settings** (para recuperação de senha).
3. Executar `npx vercel --prod --yes` e testar os dois envios (recuperação e confirmação opcional).

---

## 5. Diagnóstico de falhas de e-mail

| Sintoma | Onde olhar | Causa provável e ação |
| --- | --- | --- |
| Recuperação retorna `404` | Tela de login / `api/handler.js` | Comportamento esperado (ADR-002): não existe conta em `auth.users` para o e-mail digitado. |
| Recuperação retorna `200`, mas e-mail não chega | Supabase Dashboard → Logs → Auth | Verificar senha de aplicativo SMTP, caixa de Spam/Lixo Eletrônico ou fila do provedor (Yahoo pode levar 1–5 min). |
| Confirmação opcional retorna `503` | `npx vercel logs --deployment sync-solucoes.vercel.app --since 10m` | Verificar o campo `etapa` ou `code`/`responseCode` no log (ex.: `EAUTH` = senha SMTP incorreta, `ETIMEDOUT` = porta/SSL incorretos, `verificacao-email` = secret HMAC divergente). |
| Confirmação retorna `429` | Cabeçalho `Retry-After` | Rate limit atingido (`AUTH_CONFIRMATION_LIMIT`). Aguardar o término da janela configurada. |

---

## 6. Pré-requisitos antes de abrir para clientes externos (Bloco 5)

1. **Projeto Supabase Preview separado:** criar um segundo projeto Supabase exclusivo para o ambiente `Preview` da Vercel, aplicar as migrações (`001`–`013`), configurar secrets HMAC separados e apontar as variáveis de `Preview` na Vercel para esse projeto.
2. **Ensaio de backup e restore (RPO ≤ 24h / RTO ≤ 4h):**
   - Exportar dump lógico ou snapshot do projeto de teste (`npx supabase db dump --linked -f backup-teste.sql` ou backup gerenciado no plano Pro).
   - Restaurar em banco limpo/staging e verificar contagem de `restaurantes`, `membros_restaurante`, `lotes`, `partes_lote` e `saidas_estoque`, além de rodar uma consulta autenticada por RLS.
   - Registrar data, responsável e tempo total de restauração em `docs/implementation/status.yaml`.
3. **Provedor SMTP transacional:** antes de uso comercial, substituir Yahoo SMTP por serviço transacional com domínio próprio autenticado (SPF, DKIM e DMARC) e planos comerciais Vercel Pro + Supabase Pro.
