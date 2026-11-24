# VisionChef — primeira versão profissional

**Status** — Escopo inicial do piloto documentado. Telas em revisão.

## Problema e público

Donos e funcionários de restaurantes pequenos precisam identificar os lotes que vencem primeiro sem interromper o preparo para procurar datas no caderno. O problema veio do enunciado do simulado. As entrevistas registradas até aqui foram simuladas. Veja a [definição do desafio](<../../Insumo vencendo na cozinha/desafios/E1.md>) e a [proposta do protótipo](<../../Insumo vencendo na cozinha/desafios/E3.md>).

## Decisões do piloto

- Começar com um restaurante. Cada lote pertence a um restaurante, de modo que outros estabelecimentos possam ter estoques separados no futuro.
- Hospedar o site na Vercel e armazenar os registros no Supabase.
- Usar contas individuais. Dono e funcionário podem consultar, cadastrar e corrigir lotes. O dono pode convidar pessoas e remover acessos.
- Registrar uso e descarte de lotes, inclusive parciais. O lote permanece na lista de estoque ativo enquanto houver saldo.
- Manter a validade original informada na embalagem. Quando houver abertura ou fracionamento, a equipe registra a data da operação e a validade aplicável. A lista considera a mais próxima entre a validade original e a informada após a abertura ou o fracionamento.
- Quando apenas parte do lote for aberta ou fracionada, mostrar as quantidades abertas e fechadas separadamente. Ambas ficam vinculadas ao mesmo lote de origem e mantêm o código do fabricante quando informado.
- Cadastrar quantidades em unidades, quilos ou litros. Uma embalagem pode ser contada como uma unidade. Quilos e litros aceitam frações. As movimentações usam a medida cadastrada para o lote.
- Para lotes cuja validade aplicável já passou, bloquear o registro de uso e manter disponíveis a correção da validade e o registro de descarte.
- Avaliar o cadastro de novos restaurantes depois do piloto. O plano está registrado em [Futuras implantações](../futuras-implantacoes/README.md).

## Jornada principal

1. A pessoa entra com sua conta.
2. Cadastra um lote com validade e quantidade inicial e salva.
3. Confere o lote na lista do restaurante, ordenada pela data de vencimento.
4. Se necessário, corrige a validade e confere a nova posição do lote.
5. Registra quanto do lote foi usado ou descartado. Confere o saldo na lista enquanto houver quantidade em estoque.

O resultado esperado é que dois lotes cadastrados em um aparelho apareçam em ordem de vencimento em outro aparelho autorizado. Os demais critérios estão nos [requisitos do piloto](requirements.md).

## Telas e experiência

O [rascunho das telas do piloto](user-flows.md) descreve a jornada no celular e os estados a revisar antes da implementação.

## Pesquisa para a rotina do piloto

- Na validação do piloto, observar como a cozinha identifica insumos abertos ou fracionados e de onde tira a validade aplicável. A [referência da Anvisa sobre boas práticas em serviços de alimentação](https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2004/res0216_15_09_2004.html) aborda esses casos no item 4.8.6.
