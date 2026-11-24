# Prévia do VisionChef na Vercel e no Supabase

A prévia usa dados fictícios em um projeto Supabase de teste e uma implantação Preview protegida na Vercel. O projeto de produção e o convite da equipe do restaurante ficam para depois dos testes de aceite.

## 1. Preparar o banco de teste

1. Na conta do VisionChef, crie um projeto Supabase de teste. Copie o identificador do projeto, a URL HTTPS e a chave publicável `sb_publishable_`.
2. Autentique a CLI do Supabase e, na raiz do repositório, vincule o projeto. Troque `REF_DO_PROJETO_DE_TESTE` pelo identificador copiado. Confira o destino e a lista de migrações na simulação antes de aplicar.

   ```powershell
   supabase link --project-ref REF_DO_PROJETO_DE_TESTE
   supabase db push --dry-run --remote
   supabase db push --remote
   supabase functions deploy login-usuario --project-ref REF_DO_PROJETO_DE_TESTE
   ```

3. No painel do Auth, desative cadastro público e acesso anônimo. Em **Authentication → Users**, crie contas individuais de teste com endereços controlados pela equipe e senhas exclusivas. Para o teste de isolamento, crie um restaurante fictício adicional e uma terceira conta.
4. Pelo SQL Editor do projeto de teste, cadastre os restaurantes em `public.restaurantes` com o fuso `America/Sao_Paulo`. Use os UUIDs do Auth para inserir os vínculos em `public.membros_restaurante` com os papéis `dono` e `cozinheiro`. Cadastre um nome único para cada conta em `public.nomes_usuario`. Os testes locais criam registros fictícios automaticamente. O Supabase hospedado usa contas criadas no próprio Auth.

[Fluxo de migrações do Supabase](https://supabase.com/docs/guides/local-development/cli-workflows) · [Configuração do Supabase Auth](https://supabase.com/docs/guides/auth/general-configuration)

## 2. Gerar a prévia protegida

1. Na conta do VisionChef na Vercel, vincule a raiz do repositório local a um projeto novo com a CLI. Configure Node.js 24.x e habilite Vercel Authentication para Preview em **Deployment Protection**. Use o envio manual da prévia nesta etapa, com a integração automática com o GitHub desativada.
2. Em **Environment Variables**, selecione **Preview** para as duas variáveis abaixo. A saída estática expõe esses dois valores ao navegador.

   | Nome | Valor |
   | --- | --- |
   | `VISIONCHEF_SUPABASE_URL` | URL HTTPS do projeto de teste |
   | `VISIONCHEF_SUPABASE_PUBLISHABLE_KEY` | Chave `sb_publishable_` do mesmo projeto |

3. Na raiz, execute `vercel deploy --environment=preview`. Confirme no painel que a implantação está em Preview. O arquivo [vercel.json](../../vercel.json) instala as dependências do build, gera `dist/` e preserva a barra final de `/estoque/`. O [.vercelignore](../../.vercelignore) exclui os dados e as configurações locais do envio.
4. Em **Edge Functions → Secrets** do Supabase de teste, defina `VISIONCHEF_LOGIN_ORIGINS` com a origem HTTPS exata da prévia, sem caminho nem barra final. Quando houver mais de uma origem autorizada, separe-as por vírgula. Use a mesma URL ao testar o login por nome.

[Configuração da Vercel](https://vercel.com/docs/project-configuration/vercel-json) · [Proteção da prévia](https://vercel.com/docs/deployment-protection) · [Comando de implantação](https://vercel.com/docs/cli/deploy)

## 3. Validar antes de convidar a equipe

- Em uma janela privada, confirme que a prévia exige autenticação da Vercel. Depois de autorizado, abra `/#prototipos`, entre por nome e por e-mail com a mesma conta e recarregue `/estoque/` diretamente.
- Com as contas fictícias, cadastre e corrija um lote, registre abertura, uso e descarte, confira o saldo e o histórico com o dono e confirme o isolamento da conta do outro restaurante.
- Registre o resultado da verificação de permissões, limitação de tentativas e escopo da sessão no projeto hospedado. O cliente integrado ainda usa `sessionStorage`. Confira os requisitos de sessão, convite e recuperação em [segurança de contas](seguranca-contas.md) antes de convidar a equipe.
