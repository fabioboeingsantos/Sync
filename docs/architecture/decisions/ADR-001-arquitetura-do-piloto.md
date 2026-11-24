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
