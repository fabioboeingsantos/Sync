# Roteiro de ensaio — VisionChef · Time SYNC

[Slides E4](E4-pitch-slides.html) · [Estúdio de voz](ensaio-voz.html) · [Entrega E4](../desafios/E4.md)

**10 slides · meta de 2min50s · limite de 3min.** A programação reserva 10 segundos para pausas e trocas de tela. No Slide 7, deixe o vídeo chegar ao fim da primeira reprodução, mesmo que termine a fala antes.

| Slide | Tempo | Tela | Guia de fala |
| --- | --- | --- | --- |
| 1 | 00:00 – 00:04 | Abertura animada | Mostre a vinheta da SYNC. |
| 2 | 00:04 – 00:20 | Insumo vencendo na cozinha | Conte a cena do creme de leite e apresente o VisionChef. |
| 3 | 00:20 – 00:35 | O prejuízo invisível do caderno | Explique por que a validade passa despercebida. |
| 4 | 00:35 – 00:47 | O que investigamos antes de desenhar a solução | Destaque a dúvida prioritária D1 da Matriz CSD. |
| 5 | 00:47 – 01:02 | O que os cenários simulados revelaram | Identifique P01 e P02 como perfis simulados. |
| 6 | 01:02 – 01:17 | VisionChef: simples como o caderno, ágil como PVPS | Apresente o fluxo de cadastro, prioridade e baixa. |
| 7 | 01:17 – 02:16 | VisionChef funcionando na prática | Acompanhe o vídeo com estoque visual, filtros, bloqueio de vencidos, cadastro com Vision e relatório. |
| 8 | 02:16 – 02:31 | Viabilidade e próximos passos fiscais | Separe XML e leitura de rótulos, já disponíveis, da captura automática planejada. |
| 9 | 02:31 – 02:44 | VisionChef pronto para ser testado | Cite o piloto online e os 31 testes automatizados. |
| 10 | 02:44 – 02:50 | Muito obrigado! | Deixe o QR Code visível para a banca. |

## Fala por slide

### Slide 1 · Abertura animada (00:00 – 00:04)

> Olá! Somos o Time SYNC.

### Slide 2 · Insumo vencendo na cozinha (00:04 – 00:20)

> Imagine abrir um creme de leite novo na correria do almoço…
>
> e encontrar dois potes vencidos no fundo da geladeira no sábado. Eu sou [seu nome] [e, se quiser, os nomes da equipe] e hoje apresento o VisionChef.

### Slide 3 · O prejuízo invisível do caderno (00:20 – 00:35)

> Em restaurantes pequenos, o estoque costuma ficar no caderno. Na correria, a compra nova empurra os lotes antigos para o fundo. Como saber o que vence primeiro sem interromper o preparo?

### Slide 4 · O que investigamos antes de desenhar a solução (00:35 – 00:47)

> Na Matriz CSD, priorizamos uma pergunta: como a equipe escolhe qual lote usar primeiro e quando percebe que um ingrediente venceu?

### Slide 5 · O que os cenários simulados revelaram (00:47 – 01:02)

> Nos cenários simulados, o cozinheiro pega o lote mais à frente porque o caderno está longe. O dono só percebe o descarte no fechamento. O celular já está à mão.

### Slide 6 · VisionChef: simples como o caderno, ágil como PVPS (01:02 – 01:17)

> No celular, a equipe cadastra o lote, vê o que vence primeiro e registra uso ou descarte. Essa ordem é o PVPS: Primeiro que Vence, Primeiro que Sai.

### Slide 7 · VisionChef funcionando na prática (01:17 – 02:16)

> No estoque, a equipe vê a foto e o saldo de cada produto e pode alternar entre lista e grade.
>
> Os filtros mostram o que exige atenção. O alerta de vencimento no dia ajuda a decidir o que usar primeiro.
>
> Se o lote venceu, o sistema bloqueia o registro de uso. A equipe pode registrar o descarte ou corrigir uma data que foi digitada errada.
>
> No cadastro, o Vision aceita texto, voz, foto do rótulo ou o arquivo da nota fiscal. A equipe confere os dados sugeridos antes de salvar.
>
> O dono acompanha os descartes no relatório mensal e consegue ver o que foi perdido sem esperar o fechamento.

### Slide 8 · Viabilidade e próximos passos fiscais (02:16 – 02:31)

> A Fase 1 importa o XML e completa dados por voz; a Fase 3 lê o rótulo com OCR local. A Fase 2, opcional, prevê integração futura com a SEFAZ.

### Slide 9 · VisionChef pronto para ser testado (02:31 – 02:44)

> O piloto está no ar e passou em 31 testes automatizados. A ideia é simples: a equipe vê o que vence primeiro antes que o lote fique esquecido na geladeira.

### Slide 10 · Muito obrigado! (02:44 – 02:50)

> Testem o VisionChef pelo QR Code. Muito obrigado!

## Preparação

- Inicie o vídeo do Slide 7 no começo, sem som. Se o vídeo falhar, use a [demonstração local de reserva](../htmls/E3-mvp-validade.html?demo=ux) e resuma estoque, vencimento e descarte.
- Confira o QR Code do Slide 10 no celular antes de apresentar e deixe a tela aberta após agradecer.
- Ensaie com os nomes da equipe e o cronômetro. Se precisar recuperar tempo, encurte a explicação fiscal do Slide 8 e preserve o fechamento.

## Respostas rápidas para a banca (Método P.R.E. — máx. 30s)

1. **Pausa** (ouça até o fim) → **Reconhece** (*"Ótima pergunta!"*) → **Entrega** objetiva e honesta:
   - ***"Por que não usar planilha ou um ERP já existente?"***  
     *"Na validação vimos que o dono testou ERP no PC e a equipe abandonou na segunda semana por custo e excesso de telas, e planilha no celular trava na correria do preparo. O VisionChef corta o excesso e resolve em segundos o que vence primeiro."*
   - ***"E se o cozinheiro esquecer de cadastrar na correria?"***  
     *"Por isso deixamos apenas dois campos obrigatórios — insumo e validade — e criamos também o preenchimento assistido por texto ou voz, onde a pessoa fala o lote e só confirma."*
   - ***"Vocês testaram com restaurantes reais?"***  
     *"Nesta etapa de treino, nossas entrevistas foram simuladas com foco na rotina real de cozinhas pequenas e validamos o sistema com 31 testes automatizados (concorrência, duplicidade, bloqueio de vencidos, NF-e XML, fornecedores e acesso de equipe). Nosso próximo passo imediato é rodar o teste de 20 minutos em cozinhas reais — o sistema já está no ar no QR Code pronto para isso."*
   - ***"Como vocês lidam com as notas fiscais (NF-e / NFC-e) na chegada das compras?"***  
     *"Mapeamos a realidade do Brasil: na NF-e existe o bloco `<rastro>` com lote e validade, mas o campo pode vir vazio. Por isso estruturamos em 3 fases: na Fase 1 (já ativa), importamos o XML no navegador, aproveitamos `<rastro>` quando vem e o Vision completa a validade por voz; na Fase 3 (já rodando localmente no estoque), lemos lote e validade da embalagem por OCR direto no aparelho sem API paga; e na Fase 2 (opcional pós-piloto) planejamos conectar à SEFAZ (DF-e com Certificado A1) e QR Code da NFC-e."*
   - ***"Como isso se sustenta / gera receita?"***  
     *"No piloto rodamos em camadas gratuitas na nuvem (Vercel e Supabase), com custo quase zero. A hipótese pós-piloto é um modelo freemium: gratuito para 1 restaurante testar e assinatura mensal enxuta para múltiplos usuários, alertas diários e histórico estendido."*
