# Pauta experimental — Assistente de registro de insumos

**Status:** proposta experimental  
**Nome na interface:** Assistente de estoque — preenchimento de cadastro

## Objetivo

Investigar se interpretar uma descrição do lote em linguagem natural agiliza o preenchimento em relação ao formulário manual. Consulte o [MVP da E3](../E3.md).

## Fluxo mínimo e limites

A pessoa digita uma descrição, confere os campos sugeridos e confirma o cadastro.  
O assistente sugere insumo, lote e validade. O formulário verifica os campos obrigatórios e a data, e a pessoa confirma o registro.  
Peça esclarecimento quando faltar um campo. Em caso de falha, mantenha o texto e disponibilize o formulário manual.

## Demonstração e testes

| Caso | Entrada fictícia | Resultado esperado | Resultado observado |
| --- | --- | --- | --- |
| Entrada clara | Creme de leite, lote A12, validade 19/11/2026. | Exibir os três campos para conferência antes de salvar. | Pendente |
| Informação ausente ou ambígua | Queijo, lote B02, vence na terça. | Pedir a data completa antes de confirmar. | Pendente |
| Erro de interpretação ou falha do serviço | Serviço indisponível durante a interpretação do lote A12. | Permitir o preenchimento manual e preservar o texto digitado. | Pendente |

Compare tempo, acerto e correções com o fluxo atual. Registre a decisão de seguir, ajustar ou arquivar o experimento.
