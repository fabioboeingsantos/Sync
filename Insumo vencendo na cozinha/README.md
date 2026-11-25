# Insumo vencendo na cozinha

**VisionChef** é o sistema de controle de validade para cozinhas desenvolvido pela **SYNC**. A coruja identifica a SYNC, e a marca VisionChef identifica as telas de estoque e cadastro.

Segundo simulado da UC6. Um restaurante pequeno controla o estoque em um caderno. Ingredientes vencem no fundo da geladeira, e o desperdício só aparece no fim do mês. A situação afeta o dono e o cozinheiro. Consulte as [regras do modelo](regras.md) e o [guia UC6](docs/GUIA-SIMULADO-UC6.md).

| Arquivo | Quando usar |
| --- | --- |
| [E1](desafios/E1.md), [CSD](Matriz-CSD.md) e [persona](persona.md) | Definir problema, público e desafio. |
| [E2](desafios/E2.md) | Entrevistar e registrar a revisão da CSD. |
| [E3](desafios/E3.md) e [MVP](htmls/E3-mvp-validade.html) | Planejar, executar e testar o MVP (abrir `htmls/E3-mvp-validade.html` direto no navegador). |
| [E4](desafios/E4.md), [roteiro](pitch/roteiro.md), [slides](pitch/E4-pitch-slides.html) e [ensaio de voz](pitch/ensaio-voz.html) | Preparar, ensaiar com voz/cronômetro, apresentar e exportar o pitch em PDF (`Ctrl + P`). |
| [E5](desafios/E5.md) | Organizar PDF, link e evidências. |
| [Índice de imagens](imagens/README.md) | Registrar as imagens produzidas para este tema. |
| [Agente de IA](agente_IA/agente_IA.md), [arquitetura](agente_IA/arquitetura-passo-a-passo.md), [roadmap fiscal](../docs/futuras-implantacoes/integracao-notas-fiscais.md) e [protótipo IA](htmls/agente-ia-cadastro.html) | Discutir em sala e testar o assistente (5 simulações, VoicePill, alerta de lote repetido e importação de XML NF-e Fase 1). |
| [Landing page](../index.html) e [animação da SYNC](docs/animacao-sync.md) | Abrir a página inicial e consultar os tempos da animação. |

### Como executar os arquivos HTML (`htmls/`)
- **MVP da E3 (manual):** abra [htmls/E3-mvp-validade.html](htmls/E3-mvp-validade.html) no Chrome/Edge (com as 4 cores de validade nos temas claro/escuro e alerta contra lote repetido).
- **MVP com assistente integrado:** abra [htmls/agente-ia-cadastro.html](htmls/agente-ia-cadastro.html) para testar as **5 simulações interativas** (incluindo erro de data ambígua), o microfone animado **VoicePill**, a **trava contra lotes repetidos** e a **Fase 1 de importação de XML NF-e** (`Simular NF-e` ou envio de `.xml` real). Veja a pauta em [agente_IA/agente_IA.md](agente_IA/agente_IA.md).
- **Ferramentas de avaliação:** abra o [estoque manual com lotes de exemplo](htmls/E3-mvp-validade.html?demo=ux) ou o [assistente com controles extras de teste](htmls/agente-ia-cadastro.html?teste=1).

Para apresentar, abra os [slides do pitch](pitch/E4-pitch-slides.html) no navegador (`F` para tela cheia, `T` para Claro/Escuro e `Ctrl + P` para exportar o PDF) e treine no [estúdio de ensaio e voz](pitch/ensaio-voz.html).

**Status geral (Time SYNC):** E1 concluída, E2 concluída para treino (simulada, com telas exploratórias registradas), E3 com Lean Canvas, MoSCoW, MVP (4 cores semânticas nos temas claro/escuro com alerta pulsante em *Vence hoje*, trava contra lote duplicado, microfone VoicePill, 5 simulações interativas e Fase 1 de importação de XML NF-e) e 26/26 testes técnicos aprovados; slides, roteiro e estúdio de ensaio da E4 atualizados com o roadmap fiscal em 3 fases e QR Code. Piloto web publicado como plus em `https://sync-solucoes.vercel.app`.

## Revisão dos 19 itens de lançamento

Revisão atualizada em 25/11/2026 cobrindo as **demonstrações gratuitas** (`localStorage`, sem conta) e o **piloto online** (`https://sync-solucoes.vercel.app`, com contas individuais, Vercel Functions e Supabase). A [página de informações](../informacoes.html) descreve o funcionamento vigente.

| # | Item | Situação no VisionChef |
| --- | --- | --- |
| 1 | Política de privacidade | Página acessível no rodapé e nos formulários ([informacoes.html](../informacoes.html#privacidade)). Política de retenção e exclusão LGPD documentada em [brief.md](../docs/product/brief.md). |
| 2 | Termos de uso | Página acessível no rodapé ([informacoes.html](../informacoes.html#termos)). Informa gratuidade, escopo das funções e necessidade de conferir a embalagem e a conservação do insumo. |
| 3 | Política de cookies | Documenta o cookie estritamente necessário de sessão no piloto (`HttpOnly`, `SameSite=Strict`, `Secure`, 7 dias por inatividade com renovação até 30 dias e opção *Sair de todos os dispositivos*) e o `localStorage` separado nas demonstrações (`insumo-e3-lotes-v1/v2`, `insumo-e3-descartes-v1/v2`). |
| 4 | Aviso de cookies | O site não usa cookies de publicidade, rastreadores opcionais nem analytics de terceiros; usa apenas cookie técnico de autenticação no piloto e informa claramente em [informacoes.html](../informacoes.html#armazenamento). |
| 5 | Reembolso e cancelamento | Sem vendas, pagamentos ou cobranças nesta versão. Se houver cobrança futura, definir regras, prazos e canal antes de ativá-la. |
| 6 | Consentimento nos formulários | Os formulários explicam o armazenamento. O ditado é opcional, informa o possível uso de serviço de voz do navegador e só inicia por ação do usuário. |
| 7 | Dados necessários | No cadastro de lote, insumo e validade são obrigatórios; código, local e demais campos são opcionais. Na conta do piloto, apenas usuário único e e-mail (sem dados sensíveis). |
| 8 | Analytics | Sem scripts ou eventos de medição de audiência de terceiros no bundle publicado (`dist/`). |
| 9 | Embeds de terceiros | O site publicado carrega apenas recursos locais/próprios. O ditado pode usar o serviço de voz do navegador após ação explícita da pessoa. |
| 10 | Acessibilidade | Navegação por teclado, atalho para conteúdo, hierarquia de títulos, `aria-expanded`, `prefers-reduced-motion`, rótulos claros e estados transmitidos por texto e cor. |
| 11 | Texto alternativo | O emblema da SYNC é descrito na abertura; links com logo nas telas de estoque e equipe têm nome acessível (`aria-label`). |
| 12 | Contraste | Paleta oficial **Aço Inox** (`style-guide.md`): branco sobre `#0F4C5C` (9,51:1), `#2A7F8E` sobre branco (4,64:1), grafite `#182327` sobre `#A8D5DD` (10,11:1) e alerta `#B3261E` (6,03:1). |
| 13 | Formulário por teclado | Campos inválidos recebem indicação textual, `aria-invalid` e foco automático; cancelamento devolve o foco ao controle de origem. |
| 14 | Botões claros | Padrão global **GlassSurface + Aço Inox** (`css/botoes.css`) com rótulos de verbo claro (*Salvar lote*, *Registrar abertura*, *Liberar acesso*, *Remover acesso*). |
| 15 | Avaliações e depoimentos | Sem avaliações ou depoimentos inventados. Lotes da abertura e relatos da E2 são explicitamente identificados como exemplo/simulação. |
| 16 | Dados da empresa | Identifica a **SYNC** como equipe desenvolvedora e o **VisionChef** como solução; sem CNPJ ou cadastro empresarial fictício. |
| 17 | Direitos das imagens | Emblema da SYNC e marca VisionChef são ativos próprios do projeto, registrados em [imagens/README.md](imagens/README.md). |
| 18 | Leis locais e setoriais | Análise considera LGPD, WCAG 2.2, LBI, CDC e boas práticas sanitárias (Anvisa RDC 216/2004, item 4.8.6) para validade pós-abertura. |
| 19 | Riscos operacionais | Piloto online com banco PostgreSQL (RLS), 26/26 testes automatizados, CI no GitHub Actions, `/api/health` e [runbook.md](../docs/operations/runbook.md); ambiente Preview separado e ensaio de backup/restore planejados antes de operação comercial. |

Verificação local no Chrome em perfil limpo: navegação por teclado, filtros, links de privacidade, erros e cancelamento de edição nos dois cadastros, persistência após recarregar e ausência de rolagem horizontal na abertura a 320, 390 e 1280 px. O fluxo verificado não carregou cookies nem fez requisições HTTP externas com o ditado inativo. O funcionamento do ditado e as configurações de hospedagem ficam para a validação da versão publicada.

Referências oficiais para revisão. [LGPD](https://planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) · [Guia de cookies da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais) · [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · [Lei Brasileira de Inclusão](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2015/lei/l13146.htm) · [Código de Defesa do Consumidor](https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm) · [Lei de Direitos Autorais](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm)
