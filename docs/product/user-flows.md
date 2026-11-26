# VisionChef — telas e fluxos do piloto

**Status** — Rascunho para revisão. Os nomes de telas e os estados abaixo são propostas de interface.

| Tela ou ação | Quem usa | Caminho principal e estados a revisar |
| --- | --- | --- |
| Página pública | Pessoa interessada | Conhecer o VisionChef por meio da apresentação do produto e da demonstração de lotes; não oferece botões de entrar ou criar conta. Links diretos de confirmação e recuperação continuam sendo atendidos. |
| Primeiro acesso | Dono e funcionário | O dono informa o nome do novo restaurante e vai ao estoque com o vínculo criado. Para entrar em equipe existente, pedir ao dono que use **Equipe → Liberar acesso** com o e-mail da conta. Depois, selecionar **Verificar meu acesso** para consultar a liberação e abrir o estoque. |
| Entrar | Dono e funcionário | Entrar com usuário ou e-mail e senha. Contas com vínculo ativo vão ao estoque. Contas que aguardam vínculo voltam à configuração de acesso. A tela oferece recuperação de senha como ação secundária. |
| Minha conta | Pessoa autenticada | Abrir uma página própria. Consultar e-mail, usuário e acesso ao estoque; completar o usuário quando a conta legada ainda não tem um nome personalizado; ver claramente e-mail confirmado ou pendente; solicitar confirmação nesta área; trocar senha após confirmar a senha atual (sem exibi-la); recuperar a senha por link; encerrar todas as sessões. |
| Recuperar senha | Pessoa sem sessão | Informar o e-mail e receber resposta genérica. O link abre o formulário para escolher nova senha. Não oferecer reenvio de confirmação nesta tela. |
| Estoque | Dono e funcionário | Consultar o saldo agregado por produto e alternar entre grade e lista. Identificar cada alimento pela foto com o nome sobreposto. A ação de cada item abre o Controle de validade filtrado para aquele insumo. |
| Controle de validade | Dono e funcionário | Consultar lotes por vencimento, filtrar por situação e insumo, cadastrar ou corrigir lote, registrar abertura, uso ou descarte. Saldos agregados do Estoque refletem os mesmos lotes. |
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

- `/` para a apresentação do VisionChef e a demonstração ilustrativa de validade.
- `/estoque/` para entrar na área do produto.
- `/estoque/` começa no módulo **Estoque**, com grade/lista e filtros por produto e categoria. O Dock inferior organiza **Estoque**, **Controle de validade**, **Relatório de desperdício**, **Equipe** e **Fornecedores** conforme o perfil; o relatório é um módulo independente acessível apenas ao dono. O botão **Adicionar entrada** abre o cadastro manual. O sino BellToggle mostra somente itens que vencem hoje ou em breve e exibe a contagem desses alertas. Os saldos do estoque são calculados dos mesmos lotes e o tema claro/escuro acompanha o Dock.
- `/equipe/` (com redirecionamento de `/equipe` para `/equipe/`) para o dono ativo liberar acesso por usuário ou e-mail, reativar vínculos e remover acessos com efeito imediato mesmo com sessão aberta.
- `/conta/` para consultar dados pessoais, confirmação do e-mail e segurança da senha numa página independente, responsiva e compatível com tema claro ou escuro.

## Demonstração local do estoque

- A conta fictícia `dono@piloto.test` / `dono.piloto` começa com 20 alimentos perecíveis em lotes de até 25 unidades, kg ou litros. O seed é idempotente e não repõe produtos que a pessoa já consumiu ou alterou.
- A grade e a lista mostram o nome legível sobre cada foto e nos dados do cartão. As quantidades vencidas são destacadas como bloqueadas; o saldo disponível exclui lotes vencidos.
- As fotos foram otimizadas para JPEG quadrado de 640 px. As 12 fotos de hortifruti mantêm atribuição em [créditos das imagens](creditos-imagens-estoque.md); as outras 8 são ilustrações geradas para este catálogo.
