# Insumo vencendo na cozinha

**VisionChef** é o sistema de controle de validade para cozinhas desenvolvido pela **SYNC**. A coruja identifica a SYNC, e a marca VisionChef identifica as telas de estoque e cadastro.

Segundo simulado da UC6. Um restaurante pequeno controla o estoque em um caderno. Ingredientes vencem no fundo da geladeira, e o desperdício só aparece no fim do mês. A situação afeta o dono e o cozinheiro. Consulte as [regras do modelo](regras.md) e o [guia UC6](../docs/GUIA-SIMULADO-UC6.md).

| Arquivo | Quando usar |
| --- | --- |
| [E1](../desafios/E1.md), [CSD](Matriz-CSD.md) e [persona](persona.md) | Definir problema, público e desafio. |
| [E2](../desafios/E2.md) | Entrevistar e registrar a revisão da CSD. |
| [E3](../desafios/E3.md) e [MVP](htmls/E3-mvp-validade.html) | Planejar, executar e testar o MVP (abrir `htmls/E3-mvp-validade.html` direto no navegador). |
| [E4](../desafios/E4.md), [roteiro](pitch/roteiro.md) e [slides](pitch/E4-pitch-slides.html) | Preparar, apresentar e exportar o pitch em PDF (`Ctrl + P`). |
| [E5](../desafios/E5.md) | Organizar PDF, link e evidências. |
| [Índice de imagens](imagens/README.md) | Registrar as imagens produzidas para este tema. |
| [Agente de IA](agente_IA/agente_IA.md), [arquitetura](agente_IA/arquitetura-passo-a-passo.md) e [protótipo IA](htmls/agente-ia-cadastro.html) | Discutir em sala e testar o assistente de cadastro (texto natural e voz) separado do MVP manual. |
| [Landing page](../index.html) e [animação da SYNC](../docs/animacao-sync.md) | Abrir a página inicial e consultar os tempos da animação. |

### Como executar os arquivos HTML (`htmls/`)
- **MVP da E3 (manual):** abra [htmls/E3-mvp-validade.html](htmls/E3-mvp-validade.html) no Chrome/Edge.
- **MVP com assistente integrado:** abra [htmls/agente-ia-cadastro.html](htmls/agente-ia-cadastro.html) para cadastrar e consultar lotes com sugestões por texto ou voz. Veja os três casos de [teste do assistente](agente_IA/agente_IA.md).
- **Ferramentas de avaliação:** abra o [estoque manual com lotes de exemplo](htmls/E3-mvp-validade.html?demo=ux) ou o [assistente com controles de teste](htmls/agente-ia-cadastro.html?teste=1).

Para apresentar, abra os [slides do pitch](pitch/E4-pitch-slides.html) no navegador (`F` para tela cheia, `T` para Claro/Escuro e `Ctrl + P` para exportar o PDF).

**Status geral:** E1 concluída, E2 concluída para treino (simulada), MVP da E3 implementado (aguardando execução do teste com outro grupo), slides e roteiro da E4 prontos (aguardando ensaio cronometrado e exportação do PDF para E5).

## Revisão dos 19 itens de lançamento

Revisão de 24/11/2026 para a página inicial e as duas telas de estoque do VisionChef. A versão revisada é gratuita, funciona sem conta e guarda os registros no navegador. A [página de informações](../informacoes.html) descreve o funcionamento atual.

| # | Item | Situação no VisionChef |
| --- | --- | --- |
| 1 | Política de privacidade | Página de privacidade acessível no rodapé e nos formulários. Antes de publicar para uso real, identificar o responsável pelo tratamento, seu canal e as informações aplicáveis sobre direitos. |
| 2 | Termos de uso | Página acessível no rodapé. Informa as funções disponíveis, a gratuidade e a necessidade de conferir a embalagem e a conservação do insumo. |
| 3 | Política de cookies | Documenta o armazenamento local, a ausência de expiração programada e como apagar os registros. As chaves são `insumo-e3-lotes-v1`, `insumo-e3-descartes-v1`, `insumo-e3-lotes-v2` e `insumo-e3-descartes-v2`. |
| 4 | Aviso de cookies | O aplicativo não grava cookies nem usa rastreadores opcionais. Há informação sobre armazenamento local, sem banner de aceitação. Reavaliar a decisão após verificar a hospedagem e se forem adicionadas tecnologias opcionais. |
| 5 | Reembolso e cancelamento | Sem transações na versão atual. Se houver cobrança futura, definir regras, prazos e canal antes de ativá-la. |
| 6 | Consentimento nos formulários | Os formulários explicam o armazenamento. O ditado é opcional, informa o possível uso de serviço de voz e só inicia por ação do usuário. A permissão do navegador não substitui a definição de uma base legal se houver tratamento de dados pessoais. |
| 7 | Dados necessários | Nome e validade são obrigatórios. Quantidade, local e código de lote, quando disponível, são opcionais. Os campos livres são destinados a informações do estoque. |
| 8 | Analytics | A revisão do código não encontrou scripts ou eventos de medição de audiência. Verificar novamente no domínio publicado. |
| 9 | Embeds de terceiros | As páginas carregam imagens e estilos locais e não usam incorporações remotas. O ditado pode envolver o serviço de reconhecimento do navegador após a ação do usuário. |
| 10 | Acessibilidade | A abertura tem navegação por teclado, atalho para o conteúdo, hierarquia de títulos e movimento reduzido. As telas de estoque têm rótulos, foco e mensagens de erro. Falta uma avaliação completa com leitor de tela e zoom. |
| 11 | Texto alternativo | O emblema da SYNC é descrito na abertura. Nas telas de estoque, o link com a imagem do VisionChef tem nome acessível e leva à página inicial do produto. |
| 12 | Contraste | Limites dos controles da abertura atingem 3,97:1 sobre o fundo azul mais claro revisado. O texto branco no azul secundário atinge 4,64:1 e o grafite no destaque claro, 10,11:1. Essas medições cobrem as combinações indicadas. |
| 13 | Formulário por teclado | Campos obrigatórios recebem indicação de erro e foco quando o envio falha. O cancelamento da edição devolve o foco ao campo de insumo. |
| 14 | Botões claros | A abertura nomeia os dois caminhos de cadastro. O assistente usa “Preencher cadastro” e “Ditar mensagem”. Os filtros expõem o estado selecionado. |
| 15 | Avaliações e depoimentos | A página não usa avaliações, depoimentos ou resultados de clientes. Os lotes da abertura estão identificados como exemplo. |
| 16 | Dados da empresa | A página identifica a SYNC como desenvolvedora e o VisionChef como produto. Responsável e canal oficial ainda precisam ser definidos para publicação operacional. Não há cadastro empresarial verificado para exibir. |
| 17 | Direitos das imagens | O emblema da SYNC foi editado a partir da imagem fornecida pelo usuário. A marca VisionChef usa o arquivo existente no projeto. Registrar autoria, condições e autorização de uso antes da publicação externa. |
| 18 | Leis locais e setoriais | A análise considera o contexto brasileiro. Revisar LGPD, acessibilidade, direitos autorais e requisitos de consumo e alimentos conforme o uso efetivo. |
| 19 | Outros riscos operacionais | O armazenamento é local, sem backup ou sincronização entre dispositivos. Antes de operar com dados reais, avaliar hospedagem, serviço de voz, retenção, recuperação de registros e processo para incidentes. |

Verificação local no Chrome em perfil limpo: navegação por teclado, filtros, links de privacidade, erros e cancelamento de edição nos dois cadastros, persistência após recarregar e ausência de rolagem horizontal na abertura a 320, 390 e 1280 px. O fluxo verificado não carregou cookies nem fez requisições HTTP externas com o ditado inativo. O funcionamento do ditado e as configurações de hospedagem ficam para a validação da versão publicada.

Referências oficiais para revisão. [LGPD](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) · [Guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Lei Brasileira de Inclusão](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2015/lei/l13146.htm) · [Código de Defesa do Consumidor](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) · [Lei de Direitos Autorais](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm)
