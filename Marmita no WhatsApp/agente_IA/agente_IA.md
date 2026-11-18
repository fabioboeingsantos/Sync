# Pauta — Dita, assistente de produção da Dona Maria

**Status:** proposta experimental. Implementação e testes pendentes.

**Codinome:** Dita. O nome remete à ação de ditar um pedido.

**Nome na interface:** Dita · Assistente de produção.

## Objetivo

Ajudar Dona Maria a registrar pedidos confirmados e consultar quanto preparar por dia. A hipótese é que ditar um pedido e revisar a prévia pode exigir menos trabalho do que preencher os campos manualmente. A Dona Maria é uma persona fictícia do simulado.

## Interface

Tela voltada ao celular, inspirada nas ações rápidas da Flora. O microfone é a ação principal. Digitação e cadastro manual ficam disponíveis. A tela oferece duas tarefas: **Registrar pedido** e **Consultar produção**.

## Como funciona

1. Maria dita ou digita “Confirmei três marmitas para amanhã”. Se usar o microfone, ela pode revisar e corrigir a transcrição antes de enviar para análise.
2. A IA interpreta a intenção e sugere quantidade e data de preparo. Se faltar a data ou a frase estiver ambígua, a assistente pede o dado necessário.
3. O sistema mostra a data exata e a quantidade em uma prévia editável. Valida os campos e grava após Maria confirmar na tela.
4. Maria pergunta “Quantas marmitas preparo amanhã?”. A IA interpreta a consulta e o código soma os pedidos confirmados para a data, mostrando quais registros compõem o total.

## Escopo da primeira versão

Uma chamada de interpretação por mensagem, seguida de regras de validação e confirmação. O fluxo pode ser representado como estados: entrada → transcrição editável → interpretação → revisão ou consulta → resultado. A confirmação é o único caminho para gravar. O [protótipo manual da E3](../E3/index.html) serve de comparação.

Avaliar resposta em voz alta, leitura de conversas em lote e integração com WhatsApp em experimentos posteriores, se ajudarem na rotina.

## Demonstração e testes

Use dados fictícios. Comece com um pedido de **2 marmitas** já salvo para amanhã. Dite um novo pedido de **3**, revise a prévia e confirme. Consulte amanhã por voz. O resultado esperado é **5 marmitas em dois pedidos**.

| Cenário de teste | Resultado esperado |
| --- | --- |
| Pedido claro com quantidade e data | Prévia correta, com gravação após confirmação. |
| Pedido sem data | A assistente pergunta o dia e mantém o rascunho. |
| Transcrição troca “três” por “treze” | Maria consegue perceber e corrigir a quantidade antes de salvar. |
| Consulta por data | O total corresponde aos pedidos confirmados daquela data e a consulta preserva os registros. |
| Microfone indisponível | Maria consegue concluir a tarefa por texto ou pelo formulário manual. |

Compare voz e formulário usando casos equivalentes. Conte o tempo desde a entrada até a confirmação e observe o acerto dos campos, o total e a necessidade de corrigir ou pedir ajuda.

**Referência da Flora:** ações rápidas, voz e texto, prévia editável e confirmação explícita. Para Maria, a proposta é concluir e revisar o ditado antes de iniciar a análise.
