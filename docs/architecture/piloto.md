# VisionChef — desenho técnico do piloto

**Status** — Rascunho técnico alinhado à [arquitetura aprovada](decisions/ADR-001-arquitetura-do-piloto.md).

## Dados principais

| Registro | O que o VisionChef precisa guardar | Quem tem acesso |
| --- | --- | --- |
| Restaurante | Identificador, nome e fuso horário usado para comparar validades com o dia corrente. | Equipe vinculada ao restaurante. |
| Vínculo da equipe | Conta, restaurante, papel de dono ou cozinheiro e situação do acesso. O e-mail é tratado no fluxo de conta e convite. | Cada pessoa pode consultar o próprio vínculo. O dono administra os acessos da própria equipe. |
| Lote de origem | Restaurante, insumo, código do fabricante quando informado, validade original, medida e quantidade inicial. | Dono e cozinheiro do restaurante. |
| Parte do lote | Vínculo com o lote de origem, saldo, condição de abertura e, quando aplicáveis, data de abertura ou fracionamento e validade informada pela equipe. | Dono e cozinheiro do restaurante. |
| Movimentação | Parte afetada, tipo de operação, quantidade, conta que registrou e horário. | Equipe autorizada do restaurante, conforme a consulta que a interface disponibilizar. |

Validar com o piloto o fuso do estabelecimento. Definir retenção e procedimento de exclusão dos dados de acesso e operação antes de usar dados reais.

## Controles e verificações

| Situação | Controle planejado | Como conferir |
| --- | --- | --- |
| Pessoa sem vínculo tenta acessar o estoque | Conferir a conta e o vínculo ativo no servidor em todas as operações. | Usar contas de dois restaurantes fictícios e testar leitura e movimentação em ambos. |
| Duas pessoas retiram o mesmo saldo ou um envio é repetido | Validar o saldo e gravar a movimentação na mesma transação. Identificar envios repetidos da mesma operação. | Tentar retirar 6 mais 6 de um saldo de 10 em duas operações simultâneas. Conferir que apenas uma é aplicada. Repetir o envio dela e conferir que o saldo permanece 4. |
| Alguém tenta registrar uso de um lote vencido | Comparar a validade aplicável com a data do restaurante no servidor. | Tentar o registro por uma chamada de teste e verificar que saldo e histórico permanecem iguais. |
| Acesso removido após o login | Consultar o vínculo atual durante a autorização. | Remover um acesso e conferir que a sessão ainda aberta deixa de conseguir ler ou movimentar o estoque. |

## Primeira entrega de implementação

Preparar o ambiente local com dados fictícios. Construir uma jornada completa em que uma conta autorizada cadastra um lote e o encontra na lista por validade. Conferir que o registro continua disponível ao recarregar a página e que uma conta de outro restaurante fictício fica sem acesso. Depois, acrescentar abertura, saídas de estoque e convites pela tela da equipe.
