# VisionChef — modelo de ameaças (F05 / STRIDE)

**Atualizado em:** 25/11/2026  
**Escopo:** Landing Sync (`/`), `/estoque/`, `/equipe/`, API Node da Vercel (`api/handler.js`), PostgreSQL/RLS + Edge Functions Supabase e integração SMTP.

## 1. Ativos protegidos

1. **Integridade do estoque e validades:** impede uso de insumo vencido e divergência de saldo.
2. **Isolamento multi-restaurante:** dados e equipe de um restaurante jamais podem ser lidos ou alterados por outro restaurante.
3. **Credenciais e sessões:** senhas (bcrypt em produção, Argon2id local), `JWT_SECRET_KEY`, tokens Supabase, credenciais SMTP e chave `service_role`.
4. **Identidade mínima de usuários (LGPD):** associação entre `nome_usuario` e `email` e estado de verificação.

## 2. Matriz STRIDE e controles implementados

| ID | Categoria | Ameaça | Controle implementado | Verificação | Risco residual / Ação |
| --- | --- | --- | --- | --- | --- |
| TM-01 | **S**poofing | Forjar sessão JWT ou roubar tokens Supabase via XSS | Cookie `HttpOnly; SameSite=Strict; Secure; Path=/api`; assinatura HS256 verificada com `timingSafeEqual`; `dist/` sem SDK nem tokens Supabase. | `tests/api-roteamento.test.mjs` + varredura `dist/` na CI | Baixo. Manter CSP restritiva e rotação periódica de `JWT_SECRET_KEY`. |
| TM-02 | **S**poofing | Chamada direta não autorizada às Edge Functions (`login-usuario`, `limitar-autenticacao`, `verificacao-email`) | Validação obrigatória de assinatura HMAC-SHA256 (`x-vc-timestamp` + `x-vc-signature`) com janela temporal curta e `Origin` autorizada. | `tests/estoque.test.mjs` (rejeição `401`/`403` sem HMAC/origem) | Baixo. Segredo HMAC compartilhado somente via secrets Vercel/Supabase. |
| TM-03 | **T**ampering | Requisição CSRF de outro domínio alterando estoque ou equipe | `SameSite=Strict` no cookie + verificação explícita de `Origin === url.origin` em todo método não-GET/HEAD em `api/handler.js` e `scripts/dev.mjs`. | `tests/api-roteamento.test.mjs` (`403` para origem externa) | Baixo. |
| TM-04 | **T**ampering | Escrita direta em `lotes`, `partes_lote`, `membros_restaurante` ou baixa concorrente gerando saldo negativo | `REVOKE` de escrita direta para `authenticated`; toda escrita passa por RPCs `SECURITY DEFINER` com trava `for share`/`for update`, trava otimista `revisao_validade` (`PT409`) e `operacao_id` idempotente. | `tests/estoque.test.mjs` | Baixo. |
| TM-05 | **R**epudiation | Divergência sobre quem cadastrou lote ou registrou descarte | `cadastrado_por` em `lotes` e `registrado_por`/`registrado_em` em `saidas_estoque` preenchidos no servidor via `auth.uid()`. | Schema SQL `001`–`005` | Médio para auditoria de equipe: futuramente registrar tabela de auditoria de alterações de `membros_restaurante` antes da escala comercial. |
| TM-06 | **I**nformation Disclosure | Vazamento de dados entre restaurantes ou leitura da tabela `nomes_usuario` por usuário autenticado | RLS em todas as tabelas (`security_invoker = true` na view `estoque`) e `REVOKE ALL` em `nomes_usuario` e schema `private`. | `tests/estoque.test.mjs`, `tests/equipe.test.mjs` | Baixo. |
| TM-07 | **I**nformation Disclosure | Enumeração de contas no login ou na recuperação de senha | **Login:** resposta idêntica (`401`) para usuário inexistente e senha errada + dummy verify Argon2id local. **Recuperação:** resposta genérica para qualquer e-mail, sem consulta prévia de existência; limites de envio do Supabase Auth também não revelam se há conta. | `tests/estoque.test.mjs`, `tests/api-roteamento.test.mjs` e teste live | Baixo. Manter respostas e mensagens equivalentes inclusive nos limites do serviço de e-mail. |
| TM-08 | **I**nformation Disclosure | Vazamento de segredos ou PII em logs de erro ou no bundle `dist/` | Logs em `api/handler.js` imprimem apenas rota, etapa e códigos numéricos/técnicos (nunca senha, e-mail, token ou env vars). CI escaneia `dist/` contra `sb_secret_`, `JWT_SECRET_KEY`, `SMTP_PASSWORD` e `service_role`. | `.github/workflows/ci.yml` + revisão `api/handler.js` | Baixo. |
| TM-09 | **D**enial of Service | Força bruta em login, spam de cadastros ou abuso de envio SMTP | Rate limit persistente em `private.limites_autenticacao` compartilhado entre instâncias serverless (`login`, `cadastro`, `confirmacao`), além de limite de tamanho de JSON (`jsonEntrada`) e timeouts SMTP (`10s`/`15s`). | `api/handler.js` + `supabase/migrations/20261124000800` | Médio enquanto usar SMTP consumer (Yahoo); migrar para provedor transacional com SPF/DKIM/DMARC antes de produção comercial. |
| TM-10 | **E**levation of Privilege | Funcionário tentar acessar funções gerenciais; gerente tentar promover-se a dono ou revogar o acesso de um dono | RPCs e RLS conferem papel e vínculo ativo com `auth.uid()`. Gerentes só administram funcionários e outros gerentes; operações sobre donos exigem papel dono. A revogação desativa o vínculo imediatamente. | `tests/equipe.test.mjs` | Baixo. |
| TM-11 | **E**levation of Privilege | Dono remover a si mesmo deixando o restaurante órfão | `remover_membro_restaurante` e `vincular_membro_restaurante` bloqueiam remoção ou rebaixamento do último dono ativo (`PT409`). | `tests/equipe.test.mjs` | Baixo. |

## 3. Controles de ciclo de vida e dependências

- **CI obrigatória:** `.github/workflows/ci.yml` executa `npm ci`, `npm test`, `npm run build`, varredura de segredos em `dist/` e `npm audit --audit-level=high` em cada push/PR na `main`.
- **Ambiente de teste isolado:** antes de abrir a restaurantes externos, separar um projeto Supabase Preview dedicado conforme [runbook.md](../operations/runbook.md).
