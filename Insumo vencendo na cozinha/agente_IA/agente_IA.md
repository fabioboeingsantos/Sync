# Pauta experimental — Assistente de registro de insumos

**Time:** SYNC  
**Status:** protótipo implementado e validado em testes automatizados — pendente apenas comparação cronometrada em teste presencial com usuários  
**Nome na interface:** Assistente de estoque — preenchimento de cadastro  
**Onde testar (versão separada de demonstração):** [htmls/agente-ia-cadastro.html](../htmls/agente-ia-cadastro.html) (também publicado em `https://sync-solucoes.vercel.app/Insumo%20vencendo%20na%20cozinha/htmls/agente-ia-cadastro.html`)  
**Arquitetura completa passo a passo:** [arquitetura-passo-a-passo.md](arquitetura-passo-a-passo.md)

## Objetivo (conectado à dor da E2)

Investigar se interpretar uma descrição do lote em linguagem natural (texto ou voz) reduz o atrito de anotar validades na chegada das compras (`S2`), comparando com o formulário manual do [MVP da E3](../desafios/E3.md).

## Fluxo mínimo e limites

- A pessoa digita ou dita uma descrição do lote, confere os campos sugeridos e confirma manualmente o cadastro — **o assistente nunca grava um lote sozinho**.
- O assistente sugere insumo, código de lote, quantidade, local e validade; o formulário valida os campos obrigatórios antes de salvar.
- Quando a data está ausente ou ambígua (ex.: *"vence na terça"*), o assistente pede a data completa. Em caso de falha, preserva o texto digitado e mantém o formulário manual disponível.

## Demonstração e testes verificados

| Caso | Entrada fictícia | Resultado esperado | Resultado observado |
| --- | --- | --- | --- |
| **Entrada clara** | `Creme de leite, lote A12, validade 19/11/2026.` | Exibir os campos preenchidos para conferência antes de salvar. | **Aprovado.** Verificado na interface (`agente-ia-cadastro.html?teste=1`) e na suíte automatizada (`tests/interpretar-lote.test.mjs`). |
| **Informação ausente ou ambígua** | `Queijo, lote B02, vence na terça.` | Não chutar data; pedir a data completa antes de confirmar. | **Aprovado.** Validade permanece vazia e o aviso orienta a informar a data completa (verificado em teste automatizado). |
| **Erro de interpretação ou falha do serviço** | Serviço indisponível durante a interpretação do lote `A12`. | Permitir o preenchimento manual e preservar o texto digitado. | **Aprovado.** Simulado em `agente-ia-cadastro.html?teste=1` (botão **Simular falha**); texto preservado e formulário manual funcional. |

**Próximo passo (teste com pessoas):** comparar tempo de preenchimento, taxa de acerto e correções manuais entre o fluxo manual e o assistente durante a rodada presencial com outro grupo/cozinha.
