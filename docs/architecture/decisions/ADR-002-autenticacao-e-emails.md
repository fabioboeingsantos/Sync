# ADR-002 — Backend Node na Vercel, autenticação, recuperação e operação do piloto

**Status:** Aprovada pelo responsável pelo projeto em 24/11/2026  
**Substitui parcialmente:** seção de integração direta do navegador em [ADR-001](ADR-001-arquitetura-do-piloto.md)

## Contexto

O piloto do VisionChef (`C:\Users\fabio\Desktop\Sync`) evoluiu de chamadas diretas do navegador ao Supabase para uma arquitetura com API Node same-origin na Vercel (`/api/index.js` via `rewrites` em `vercel.json`) mantendo a sessão em cookie `HttpOnly; SameSite=Strict; Secure`. Ao auditar o sistema contra a especificação normativa (`F00–F09`), surgiram decisões que precisavam de aprovação explícita antes de continuar a entrega.

## Decisões aprovadas

1. **Stack mantida para o VisionChef (`Sync`):**
   - Frontend: React 19 + Vite 8 (landing/acesso) e HTML/CSS/JS em `/estoque/`.
   - Backend: Vercel Node.js Functions (Node `>=24`, Web Fetch API em `api/index.js` + `api/handler.js`).
   - Banco e Auth: PostgreSQL + Supabase Auth gerenciados em produção; PGlite no ambiente local/testes.
   - **Justificativa:** evita reescrita desnecessária para FastAPI/Python neste piloto já funcional e validado.
2. **Proteção de senhas:**
   - **Produção:** manter **Supabase Auth** (`auth.users.encrypted_password`, hash `bcrypt` com sal único). Não criar tabela paralela de senhas em produção.
   - **Ambiente local / módulo reutilizável Node:** adotar **Argon2id** (parâmetros OWASP: `m=19456 KiB`, `t=2`, `p=1`) em etapa dedicada, substituindo a comparação de `senhaLocal` em texto puro.
   - **Tokens de uso único (confirmação opcional de e-mail):** manter **SHA-256** sobre tokens aleatórios de 256 bits (`randomBytes(32)`), com expiração de 24h e consumo único.
3. **Exceção formal à regra de anti-enumeração na recuperação de senha (`SEC-04` / F05):**
   - **Contradição registrada (Regra 8):** a especificação F05 e `SEC-04` recomendam resposta genérica na recuperação de senha para evitar enumeração de contas.
   - **Decisão do responsável:** priorizar UX informando explicitamente quando o e-mail não está cadastrado (`HTTP 404 — "Nenhuma conta foi encontrada para esse e-mail."`), implementado via migração `010` (`public.email_cadastrado`, restrita a `service_role`) + Edge Function `verificacao-email` (`acao: 'existe'` sob HMAC).
   - **Mitigação obrigatória:** rate limit compartilhado em PostgreSQL (`limitar-autenticacao`) executado **antes** da consulta de existência; nenhuma informação extra da conta é exposta além de existir/não existir.
   - **Risco aceito:** enumeração lenta limitada pela janela de rate limit (`AUTH_LOGIN_LIMIT` / `AUTH_RATE_WINDOW_SECONDS`).
4. **Operação do piloto controlado (F04 / F07 / F09):**
   - **SMTP:** manter Yahoo (`smtp.mail.yahoo.com:465`, SSL, senha de aplicativo) durante o piloto controlado, ciente da latência de entrega (~alguns minutos) e dos limites de contas consumer; reavaliar provedor transacional (Resend/Brevo/Postmark) antes de escalar para usuários reais.
   - **Confirm email no Supabase:** mantido ativo durante esta etapa; desligamento só com autorização explícita após validação completa da confirmação opcional via Vercel/Nodemailer.
   - **LLM:** `llm_required: false` no piloto (o assistente de lote em `piloto/interpretar-lote.js` permanece determinístico local).
   - **Banco Preview:** planejar projeto Supabase isolado para Preview antes de abrir o piloto a usuários reais.

## Consequências e próximas etapas pendentes

- Publicar e validar em produção as melhorias já prontas (diálogo *Minha conta* em `/estoque/`, ícone de olho na senha, migração `010`, `verificacao-email` com `acao: 'existe'` e templates PT-BR).
- Etapas seguintes do roadmap do manual: implementar `/equipe` (`REQ-F-004`), implementar Argon2id no servidor local (`scripts/senhas.mjs`), criar CI (`.github/workflows/ci.yml`), `/api/health`, `threat-model.md`, `api-contract.yaml`, `runbook.md` e completar campos `DECIDIR` de LGPD/RPO/RTO antes do lançamento comercial.

## Referências consultadas (24/11/2026)

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Vercel: Rewrites](https://vercel.com/docs/rewrites)
- [Supabase: Auth Password Security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase: Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
