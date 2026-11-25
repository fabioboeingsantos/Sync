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

No piloto, public.membros_restaurante usa os papéis de acesso dono e funcionario. As categorias profissionais serão modeladas em tabelas próprias quando forem definidas, sem alterar a finalidade dos papéis de acesso.

## Integração de Notas Fiscais (NF-e / NFC-e) com a Assistente IA

**Status** — Fase 1 implementada no MVP; Fases 2 e 3 planejadas para o piloto online.

O [plano de integração de notas fiscais](integracao-notas-fiscais.md) documenta como as notas chegam nos restaurantes no Brasil (NF-e 55, NFC-e 65, grupo `<rastro>` e romaneios) e o passo a passo técnico em 3 fases:
1. **Fase 1 (Ativa no MVP):** leitura local de XML NF-e via `DOMParser` (`agente-ia-cadastro.html` e `piloto/interpretar-nfe.js`), aproveitamento de `<rastro>`, proteção contra nota/lote duplicado e conferência por voz (**VoicePill**).
2. **Fase 2 (Piloto SEFAZ):** captura automática via SEFAZ Distribuição DF-e (Certificado Digital A1), leitura de QR Code de NFC-e e tabela de De/Para de fornecedores no Supabase.
3. **Fase 3 (Câmera / Vision):** leitura da validade na embalagem (OCR) e foto de romaneio para compras sem XML.
