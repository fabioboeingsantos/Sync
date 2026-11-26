# Futuras implantações do VisionChef

## Cadastro de novos restaurantes

**Status** — Pendente para depois do piloto.

A primeira versão terá um restaurante piloto. Desde o início, cada lote deve estar vinculado ao restaurante ao qual pertence.

Quando um segundo restaurante demonstrar interesse, cadastrá-lo manualmente e configurar o acesso da equipe ao próprio estoque. Antes de liberar o acesso, conferir com contas de teste que pessoas de um restaurante não conseguem ver nem alterar lotes do outro.

Depois de testar esse processo, avaliar a necessidade de uma tela de cadastro de restaurantes.

## Portfólio e divulgação da Sync

O [plano de divulgação das soluções](portfolio-e-divulgacao-sync.md) reúne o calendário de apresentações e os materiais para anunciar a segunda solução.
## Categorias profissionais da equipe

**Status** — Planejado para uma etapa posterior ao piloto.

No piloto, `public.membros_restaurante` usa os papéis de acesso `dono`, `gerente` e `funcionario`. `Gerente` é um funcionário chefe com os mesmos acessos operacionais do dono; somente o dono pode alterar vínculos de outros donos. Categorias profissionais continuam podendo ser modeladas em tabelas próprias quando forem definidas.

## Integração de Notas Fiscais (NF-e / NFC-e) com o Vision

**Status** — Fase 1 e OCR local da Fase 3 implementados no estoque. A captura automática da Fase 2 continua opcional e depende de certificado A1 e homologação.

O [plano de integração de notas fiscais](integracao-notas-fiscais.md) documenta como as notas chegam nos restaurantes no Brasil (NF-e 55, NFC-e 65, grupo `<rastro>` e romaneios) e o passo a passo técnico em 3 fases:
1. **Fase 1 (Ativa no MVP):** leitura local de XML NF-e via `DOMParser` (`agente-ia-cadastro.html` e `piloto/interpretar-nfe.js`), aproveitamento de `<rastro>`, proteção contra nota/lote duplicado e conferência por voz (**VoicePill**).
2. **Fase 2 (opcional e futura):** consulta direta ao serviço oficial DF-e, sem API fiscal paga; depende de certificado A1, homologação e configuração segura por restaurante. QR Code NFC-e e De/Para também permanecem futuros.
3. **Fase 3 (OCR local implementado no estoque):** Tesseract.js e modelo português open source sugerem lote e validade a partir de uma foto no aparelho, sempre com revisão manual; a leitura de romaneio não está incluída.
