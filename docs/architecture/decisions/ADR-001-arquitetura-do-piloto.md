# ADR-001 — Arquitetura do piloto VisionChef

**Status** — Aprovada para o piloto, 24/11/2026.

## Decisão

- **Telas na Vercel.** Manter HTML, CSS e JavaScript e reaproveitar da versão atual os componentes adequados ao piloto. A versão profissional consulta o estoque no Supabase.
- **Contas e estoque no Supabase.** Usar Supabase Auth para contas individuais e PostgreSQL para restaurantes, vínculos da equipe, lotes, saldos e movimentações. As regras de acesso por registro, chamadas RLS, consultam o vínculo ativo da pessoa com o restaurante em cada operação. A API de dados concede leitura só do necessário. As escritas passam por operações específicas, com permissões explícitas e validação do lado do servidor.
- **Movimentações em uma transação.** Atualizar o saldo e gravar a movimentação como uma operação única. Testar pedidos simultâneos e repetidos para conferir que a mesma saída não é aplicada duas vezes e que o saldo nunca fica negativo.
- **Convite pela área da equipe.** Usar uma função de servidor para validar a sessão e a permissão do dono antes de enviar o convite. A chave administrativa fica apenas no servidor. Remover o vínculo deve impedir novo acesso ao estoque mesmo que a pessoa ainda esteja com a sessão aberta.
- **Dados de teste separados.** Testar a prévia da Vercel com dados fictícios e um projeto Supabase separado do ambiente do piloto. Versionar as alterações de banco em migrações SQL.

O [desenho técnico do piloto](../piloto.md) detalha os registros, as regras de acesso e a primeira operação a implementar.

O [levantamento de segurança de contas](../seguranca-contas.md) registra os controles existentes, os critérios para convite e recuperação e as decisões pendentes sobre senha e sessão.

## Integração do aplicativo com o banco

**Decisão —** O frontend Vite usa a biblioteca oficial do Supabase e a Data API para acessar o PostgreSQL hospedado no Supabase. O acesso a cada tabela depende de RLS e de políticas testadas por restaurante, conta e papel. As migrações do repositório continuam em SQL, versionadas em `supabase/migrations/`.

A chave publicável pode ser usada pelo navegador. Senhas do banco, chaves secretas e credenciais administrativas ficam apenas em ambientes privados do servidor. Não usar a string PostgreSQL Direct como variável do frontend.

**Conexão de backend —** Se uma operação precisar de servidor próprio, criar endpoints de backend e manter a autenticação e autorização nessa camada. Para acesso PostgreSQL em funções serverless da Vercel, avaliar o pooler em modo transaction e guardar a string de conexão como segredo. Reservar a conexão Direct para migrações, ferramentas administrativas ou serviços persistentes quando apropriado.

**Condição para reavaliar —** Considerar acesso PostgreSQL próprio quando a lógica de negócio, integrações ou processos em segundo plano exigirem uma API de servidor. Antes de implementar, decidir como validar a identidade, o vínculo ativo com restaurante e o papel em cada endpoint, e testar que RLS e permissões continuam protegendo dados entre restaurantes.


## Alternativas consideradas

O pedido de adaptar o acesso da landing levou à adoção de React e Vite nessa seção. O componente reaproveita o adaptador de autenticação e mantém a rota `/estoque/`. Uma API FastAPI separada pode ser reavaliada se surgirem integrações ou processos que peçam um serviço próprio.

## Verificações antes do piloto

- O responsável pelo VisionChef pretende criar contas novas na Vercel e no Supabase para administrar o projeto. A criação dessas contas está pendente. Depois, configurar a hospedagem e o banco de teste do VisionChef.
- Usar um segundo restaurante fictício para verificar que um membro do piloto só consegue ler e movimentar o estoque ao qual está vinculado.
- Testar a permissão de convite, a retirada de acesso com sessão ainda aberta, a regra de vencimento e as movimentações concorrentes.
- Confirmar plano e custos, região, backup e restauração antes da publicação. A Vercel exige Pro ou Enterprise para uso comercial. O plano Hobby é restrito a uso pessoal e não comercial.
- Escolher um serviço de envio de e-mails e testar convite, expiração e recuperação de conta. O envio padrão do Supabase Auth é limitado aos endereços da equipe do projeto.

## Referências consultadas

- [Vercel — opções de frontend](https://vercel.com/docs/frameworks/frontend)
- [Supabase — proteção do acesso aos dados](https://supabase.com/docs/guides/database/secure-data)
- [Supabase — gerenciamento de usuários e convites](https://supabase.com/docs/guides/auth/users)
- [Vercel — condições de uso comercial](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)
- [Supabase — envio de e-mails por SMTP próprio](https://supabase.com/docs/guides/auth/auth-smtp)
