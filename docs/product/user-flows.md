# VisionChef — telas e fluxos do piloto

**Status** — Rascunho para revisão. Os nomes de telas e os estados abaixo são propostas de interface.

| Tela ou ação | Quem usa | Caminho principal e estados a revisar |
| --- | --- | --- |
| Landing e cadastro | Pessoa interessada | Criar conta individual com usuário, e-mail e senha. O cadastro não concede papel nem acesso ao estoque. Com sessão válida, abrir a área da conta mesmo antes de existir vínculo com restaurante. |
| Entrar | Dono e funcionário | Entrar com usuário ou e-mail e senha. A tela oferece recuperação de senha como ação secundária. Se a sessão expirar, orientar a entrar novamente. Se a conta não tiver vínculo, manter a área da conta acessível e informar que o estoque aguarda a autorização do dono. |
| Minha conta | Pessoa autenticada | Consultar e-mail e estado de confirmação opcional; solicitar o e-mail de confirmação somente nesta área; confirmar por link de uso único. Permitir sair da conta. A confirmação não substitui o vínculo com restaurante. |
| Recuperar senha | Pessoa sem sessão | Informar o e-mail e receber resposta genérica. O link abre o formulário para escolher nova senha. Não oferecer reenvio de confirmação nesta tela. |
| Estoque | Dono e funcionário | Consultar o saldo e a validade aplicável. Identificar as partes abertas e fechadas pelo texto. Se estiver vazio, oferecer o cadastro do primeiro lote. Se houver falha de conexão, permitir nova tentativa. |
| Cadastrar ou corrigir lote | Dono e funcionário | Informar insumo, quantidade, medida e validade no cadastro. Corrigir os dados quando necessário. Mostrar os campos inválidos e confirmar quando o registro for salvo. |
| Registrar abertura ou fracionamento | Dono e funcionário | Selecionar o lote, indicar quanto foi aberto ou fracionado, a data da operação e a validade aplicável. Conferir no estoque a quantidade aberta e a fechada, com suas respectivas datas. |
| Registrar uso ou descarte | Dono e funcionário | Selecionar a parte do lote, o tipo de saída e a quantidade na medida cadastrada. Mostrar o saldo atualizado. Se a quantidade exceder o saldo, explicar o erro e permitir correção. |
| Acessos da equipe | Dono | Convidar pessoas e remover acessos. Mostrar o resultado da ação e indicar como tentar novamente se houver erro. |

## Revisão no celular e no computador

- Na lista, priorizar nome do insumo, saldo, validade aplicável e indicação de aberto ou fechado. Usar texto para transmitir os estados, com cor como apoio.
- Conferir se é possível localizar o próximo vencimento e registrar uma saída no celular. No computador, revisar a mesma jornada com teclado, incluindo foco visível e mensagens de erro.

## Esboço do estoque

- **Celular.** A ação **Cadastrar lote** aparece no início da tela. Cada registro mostra insumo, saldo com medida, validade e condição de abertura. Ao tocar no registro, a pessoa vê os detalhes e as ações disponíveis.
- **Computador.** Os mesmos dados aparecem em uma tabela. Cada linha abre o detalhe com as ações e o saldo da parte selecionada.
- **Exemplo fictício.** Creme de leite, parte aberta, 1 unidade, vence hoje. Creme de leite, parte fechada, 9 unidades, vence em 5 dias.

## Lotes vencidos

- Distinguir por texto os lotes que vencem hoje dos que já venceram. No detalhe do lote vencido, explicar por que o uso está bloqueado e oferecer **Corrigir validade** e **Registrar descarte**.

## Endereços do piloto

- `/#prototipos` para entrar pela landing page.
- `/estoque/` para consultar lotes. Cadastro manual ou assistido, correção, abertura e saídas partem da própria tela. O dono consulta os descartes recentes e acessa a gestão da equipe pelo botão **Equipe**.
- `/equipe/` (com redirecionamento de `/equipe` para `/equipe/`) para o dono ativo liberar acesso por usuário ou e-mail, reativar vínculos e remover acessos com efeito imediato mesmo com sessão aberta.
