# Pauta experimental — Assistente de registro de insumos

**Time:** SYNC  
**Status:** protótipo implementado e validado em testes automatizados — pendente apenas comparação cronometrada em teste presencial com usuários  
**Nome na interface:** Assistente de estoque — preenchimento de cadastro  
**Onde testar (versão separada de demonstração):** [htmls/agente-ia-cadastro.html](../htmls/agente-ia-cadastro.html) (também publicado em `https://sync-solucoes.vercel.app/Insumo%20vencendo%20na%20cozinha/htmls/agente-ia-cadastro.html`)  
**Arquitetura completa passo a passo:** [arquitetura-passo-a-passo.md](arquitetura-passo-a-passo.md)  
**Roadmap fiscal (NF-e / NFC-e — Fases 1, 2 e 3):** [integracao-notas-fiscais.md](../../docs/futuras-implantacoes/integracao-notas-fiscais.md)

## Objetivo (conectado à dor da E2)

Investigar se interpretar uma descrição do lote em linguagem natural (texto, voz via **VoicePill** ou **importação de XML da NF-e — Fase 1**) reduz o atrito de anotar validades na chegada das compras (`S2`), comparando com o formulário manual do [MVP da E3](../desafios/E3.md).

## Fluxo mínimo, simulações de apresentação e limites

- A pessoa digita, toca/segura o microfone animado (**VoicePill** com forma de onda e *arraste para cancelar*), importa um **XML de NF-e** ou testa uma das **5 simulações rápidas** sempre visíveis para quem acessa pelo QR Code — **o assistente nunca grava um lote sozinho**.
- O assistente sugere insumo, código de lote, quantidade, local e validade; o formulário valida os campos obrigatórios e **detecta lotes repetidos**, oferecendo **Editar lote existente** ou **Adicionar mesmo assim**.
- Na **Fase 1 fiscal (XML NF-e)**, o navegador lê o arquivo localmente (`DOMParser`), aproveita automaticamente o bloco `<rastro>` (`nLote` + `dVal`) quando presente, alerta se a chave da nota já foi importada e usa a assistente para completar validades faltantes.
- Quando a data está ausente ou ambígua (ex.: *"vence na terça"*), o assistente destaca o campo em erro e exibe um banner de aviso exigindo a data completa. Em caso de falha, preserva o texto digitado e mantém o formulário manual disponível.

## Demonstração e testes verificados

| Caso | Entrada / Simulação | Resultado esperado | Resultado observado |
| --- | --- | --- | --- |
| **4 cenários de validade (simulações QR Code)** | `Vence hoje`, `Vence em 2 dias`, `Dentro do prazo` e `Lote vencido` (datas dinâmicas). | Preencher campos sugeridos e, ao salvar, exibir cards com as 4 cores semânticas (com *Vence hoje* pulsando em alerta). | **Aprovado.** Disponível com 1 clique no painel do assistente nos temas claro e escuro. |
| **Informação ausente ou ambígua (erro)** | Simulação `Iogurte natural, lote E05, 3 potes, vence na terça`. | Não chutar data; marcar `Validade` com erro e exibir banner de aviso exigindo data exata. | **Aprovado.** Bloqueado com aviso claro no assistente e no formulário (e coberto por `tests/interpretar-lote.test.mjs`). |
| **Lote repetido (duplicidade)** | Tentar salvar o mesmo insumo + lote + validade já cadastrado. | Pausar o cadastro, destacar o card existente e oferecer **Editar lote existente** ou **Adicionar mesmo assim**. | **Aprovado.** Implementado no assistente, no cadastro manual e no piloto `/estoque/`. |
| **Importação de XML NF-e (Fase 1)** | Botão **Simular NF-e (4 itens)** ou envio de `.xml` padrão SEFAZ 4.00. | Ler `<det>` e `<rastro>`, normalizar nomes fiscais, avisar se a nota já foi importada e montar fila de conferência por voz/texto. | **Aprovado.** Funciona 100% no navegador via `DOMParser` + módulo reutilizável `piloto/interpretar-nfe.js`. |
| **Erro de interpretação ou falha do serviço** | Serviço indisponível durante a interpretação (`agente-ia-cadastro.html?teste=1`). | Permitir o preenchimento manual e preservar o texto digitado. | **Aprovado.** Texto preservado e formulário manual funcional. |

**Evolução planejada (Fases 2 e 3):** Fase 2 com captura automática via **SEFAZ Distribuição DF-e** (Certificado A1), leitura de **QR Code da NFC-e** e De/Para de fornecedores; Fase 3 com **câmera/OCR** na embalagem e foto de romaneio para hortifrúti sem XML.

**Próximo passo (teste com pessoas):** comparar tempo de preenchimento, taxa de acerto e correções manuais entre o fluxo manual e o assistente durante a rodada presencial com outro grupo/cozinha.
