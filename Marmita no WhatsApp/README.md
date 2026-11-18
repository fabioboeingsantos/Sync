# Marmita no WhatsApp

Projeto de Gastronomia criado para praticar as etapas do Simulado UC6 antes do Hackathon Jovem Programador. Este é o projeto de referência que deu origem à [pasta exemplo](../exemplo/README.md), com modelos que podem ser usados em outros desafios.

## Contexto e objetivo

Dona Maria é uma cozinheira autônoma fictícia que recebe pedidos de marmitas pelo WhatsApp. No enunciado, alguns pedidos se perdem nas conversas e ela tem dificuldade para estimar quantas refeições preparar no dia seguinte.

O desafio é ajudar cozinheiras autônomas a acompanhar os pedidos confirmados e planejar a produção. O protótipo permite registrar cada pedido manualmente e consultar o total pela data de preparo. Na entrevista simulada, um pedido de duas marmitas ficou fora da primeira soma e foi recuperado numa segunda conferência. O episódio orientou a proposta. A frequência e as consequências em negócios reais ainda precisam ser investigadas.

## Etapas do treino

| Etapa | Conteúdo | Situação |
| --- | --- | --- |
| [E1 — Definição do desafio](E1.md) | Tema, motivo da escolha, dor, desafio em uma frase, [Matriz CSD](Matriz-CSD.md) e [persona fictícia](persona.md). | Concluída para o treino. |
| [E2 — Validação do problema](E2.md) | Dez perguntas e respostas simuladas, decisão sobre a CSD e conclusão sobre o problema. A [tela da E2](E2/index.html) mostra o episódio da contagem. | Exercício concluído. Validação com público real em aberto. |
| [E3 — Lean Canvas e MVP](E3.md) | Nove blocos do Canvas, [protótipo](E3/index.html), dados de exemplo, testes e roteiro para coletar feedback. | MVP verificado no Chrome. Feedback de outra pessoa sem registro. |
| [E4 — Pitch](E4.md) | [Roteiro](E4/roteiro.md) com abertura, demonstração, postura e fechamento. | Ensaio em andamento, com meta de 2min55s. |
| [E5 — Arquivos da solução](E5.md) | Checklist do PDF final, link do MVP e evidências das etapas anteriores. | PDFs em montagem. Link público e QR Code a preparar, se usados. |

## Como abrir e usar o MVP

Abra [E3/index.html](E3/index.html) no navegador. O MVP usa HTML, CSS e JavaScript no mesmo arquivo e roda sem servidor ou instalação.

1. Escolha a **data de preparo** e informe a **quantidade de marmitas** de um pedido confirmado.
2. Clique em **Registrar pedido**.
3. Em **Consultar por data**, escolha o dia que quer conferir. Veja a lista e o total.
4. Use **Corrigir** para ajustar a data ou a quantidade de um pedido existente.

Os registros ficam no armazenamento local do navegador, quando disponível. Se o navegador bloquear a gravação, a página avisa que os registros serão temporários. O cadastro é manual, feito depois da confirmação com o cliente pelo WhatsApp. A tela fica em duas colunas no desktop e empilha os painéis em telas pequenas.

## Como experimentar com dados fictícios

Use duas datas vazias, por exemplo 08/01/2099 e 09/01/2099.

| Ação | Resultado esperado |
| --- | --- |
| Cadastre quantidades 2 e 3 na primeira data e 4 na segunda. Consulte cada uma. | A primeira data mostra 5 marmitas em dois pedidos. A segunda mostra 4 em um pedido. |
| Na primeira data, corrija o pedido de 3 para 4. | O total passa a 6 e a lista mantém dois pedidos. |
| Tente cadastrar quantidade zero na primeira data. | A tela bloqueia o cadastro e mantém o total em 6. |

Os três cenários passaram no Chrome a **1280 px e 375 px**. Nessas larguras, a página ficou sem rolagem horizontal. O [registro detalhado na E3](E3.md) mostra os resultados e como observar outra pessoa fazendo a tarefa.

## Como apresentar

O roteiro prevê um único apresentador em nome do time. A história parte da pergunta **“Amanhã, quantas marmitas eu preparo?”**, percorre a dor e chega à demonstração **registrar → consultar → somar**. A meta de ensaio é **2min55s**, com cinco segundos de margem até o limite.

A ideia é mostrar o QR Code entre **2:50 e 2:55** para quem quiser experimentar o MVP. Para isso, é preciso disponibilizar uma versão pública, gerar o código com esse endereço e conferir a leitura no celular. O cronômetro do ensaio deve incluir os cliques e as transições.

## Dita — proposta experimental

A [pauta da Dita](agente_IA/agente_IA.md) explora registro e consulta por voz ou texto. Maria poderia ditar um pedido, revisar a interpretação da data e da quantidade e confirmar na tela. A soma continuaria sendo calculada a partir dos pedidos salvos.

A Dita está em fase de proposta. O MVP demonstrável é o registro manual da E3. Se o experimento avançar, o teste é comparar o esforço de ditar, revisar e salvar com o preenchimento dos campos à mão.

## Materiais de referência

- [Guia geral do Simulado UC6](../GUIA-SIMULADO-UC6.md)
- [Imagens da persona e referências de criação](imagens/README.md)
- [Modelo reutilizável para novos temas](../exemplo/README.md)
