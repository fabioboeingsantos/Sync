# Roteiro de ensaio — VisionChef · Time SYNC

[Voltar à E4](../desafios/E4.md) · [Slides E4](E4-pitch-slides.html) · [Estúdio de Voz](ensaio-voz.html) · [E1](../desafios/E1.md) · [E2](../desafios/E2.md) · [E3](../desafios/E3.md) · [MVP (E3)](../htmls/E3-mvp-validade.html) · [Assistente IA](../htmls/agente-ia-cadastro.html) · [E5](../desafios/E5.md)

**Time:** SYNC *(os nomes dos integrantes são falados ao vivo na abertura)*  
**Tema:** Gastronomia — Insumo vencendo na cozinha  
**Foco da fala:** 100% na dor da persona (dono e cozinheiro de restaurante pequeno). O site publicado (`https://sync-solucoes.vercel.app`) entra como **plus de viabilidade** na demonstração.  
**Duração máxima oficial:** 3 minutos (meta de ensaio: **2min50s**, deixando 10s de margem)

> **Cola rápida de 5 segundos (8 palavras-âncora para o palco):**  
> `1. Geladeira + Time SYNC` → `2. Caderno` → `3. Dúvida D1` → `4. Celular` → `5. 3 passos PVPS` → `6. Demo + 26 testes` → `7. Roadmap fiscal` → `8. QR Code`

---

## Passo a passo com divisão de tempo

| Etapa / Slide | Tempo | Duração | Pergunta da banca que responde | O que mostrar na tela | O que falar (guia rápido) |
| --- | --- | --- | --- | --- | --- |
| **1. Capa e Gancho** | `0:00–0:14` | 14s | Qual é o problema e quem apresenta? | Emblema **SYNC · VisionChef** + cena do creme de leite esquecido | Abra na cena real (*"você abre um creme de leite novo no almoço e no sábado descobre dois potes vencidos no fundo da geladeira"*). Apresente o **Time SYNC**, cite os integrantes rapidamente e apresente o **VisionChef**. |
| **2. A Dor (E1)** | `0:14–0:36` | 22s | Quem sofre e por que dói? | Dono e cozinheiro + caderno fora da cozinha + prejuízo no fim do mês | Explique que em restaurantes pequenos o estoque fica no caderno, compras novas empurram lotes antigos para o fundo e o desperdício só estoura nas contas no fechamento do mês. |
| **3. Matriz CSD (E1)** | `0:36–0:54` | 18s | O que precisavam investigar? | Certezas, Suposições e Dúvida Prioritária (`D1`) | Mostre que antes de pensar em tela, o time mapeou a CSD e priorizou **D1**: *"como a equipe escolhe qual lote usar primeiro e quando percebe um insumo vencido?"*. |
| **4. Validação do Problema (E2)** | `0:54–1:14` | 20s | **Critério 1:** validaram a dor? | Relatos do cozinheiro (`P01`) e do dono (`P02`) | Conte o que a rotina revelou: caderno longe do fogão, caneta que apaga na geladeira, ERP de PC abandonado por ser caro/trabalhoso — e que só o celular está sempre à mão na cozinha. *(Seja transparente se citar relatos do treino simulado ou inclua relatos reais se coletados.)* |
| **5. A Solução — VisionChef (E3)** | `1:14–1:30` | 16s | Como a solução ataca a dor? | 3 passos: Registrar (manual, voz ou XML) → PVPS (4 cores) → Agir/Descartar | Resuma o VisionChef em 1 frase: fluxo rápido no celular (manual, voz no microfone ou XML da NF-e) que ordena o estoque por **PVPS** com 4 cores (com *Vence hoje* pulsando) e mostra cada descarte ao dono na hora. |
| **6. Demo do MVP + Plus Online (E3)** | `1:30–2:18` | 48s | **Critérios 2 e 3:** funciona e foi testado? | Demo do MVP + 4 alertas + trava de duplicidade + XML NF-e + 26 testes (`sync-solucoes.vercel.app`) | Mostre a ordenação PVPS com alertas visuais, correção sem duplicar, trava contra lote repetido, bloqueio de uso em vencido, o assistente com microfone/XML e destaque o piloto online com 26 testes passando. |
| **7. Viabilidade e Roadmap Fiscal (Fases 1–3)** | `2:18–2:38` | 20s | **Critérios 3 e 4:** é viável e escala na realidade do Brasil? | Custo quase zero + realidade do `<rastro>` + Roadmap Fases 1, 2 e 3 | Mostre por que funciona hoje sem hardware caro e apresente o roadmap de notas fiscais: **Fase 1** já ativa no MVP (XML NF-e + voz), **Fase 2** automática via SEFAZ DF-e (A1) e QR Code NFC-e, e **Fase 3** com câmera/OCR na embalagem. |
| **8. Fechamento + QR Code** | `2:38–2:50` | 12s | **Critério 5:** clareza e memorabilidade | Frase final + QR Code (`sync-solucoes.vercel.app`) | Retome a cena inicial (*"para nenhum insumo vencer escondido no fundo da geladeira"*), convide a banca a escanear o QR Code para testar as simulações, voz e NF-e no celular, e encerre agradecendo pelo **Time SYNC**. |
| **Margem de segurança** | `2:50–3:00` | 10s | — | — | Folga para trocas de tela, respiração e não estourar os 3 minutos do cronômetro. |

---

## Checklist rápido antes de apresentar ou gravar (E4)
- [ ] Gravar o vídeo de tela real de **45s** em `https://sync-solucoes.vercel.app/estoque/` (lista PVPS → corrigir validade → bloqueio de uso + descarte no histórico do dono → `/equipe/`) e salvar como `Insumo vencendo na cozinha/pitch/demo-visionchef.mp4`.
- [ ] Abrir [E4-pitch-slides.html](E4-pitch-slides.html), ir ao Slide 6 e confirmar que o vídeo inicia automaticamente do `00:00` (mudo e em loop).
- [ ] Conferir a leitura do **QR Code** do Slide 8 no celular antes de exportar o PDF.
- [ ] Exportar PDF via botão **Exportar PDF** (`Ctrl + P`, paisagem, gráficos de fundo ativados) — na impressão o Slide 6 troca automaticamente o vídeo pelo cartão com o link.
- [ ] Ensaiar falando e avançando os slides com cronômetro (meta: fechar em **2min45s–2min50s**).
- [ ] Se houver rodada presencial de feedback antes da gravação, citar 1 frase real de quem testou no Slide 6!

---

## Fala calibrada palavra por palavra (~385 palavras · meta 2min45s–2min50s)

1. **Slide 1 (`0:00–0:16`):** *"Imagina abrir um creme de leite novo na correria do almoço… [pausa 1s] …e, no sábado, descobrir dois potes vencidos escondidos no fundo da geladeira. Olá, banca! Eu sou [seu nome], representante do Time SYNC — com [nomes dos integrantes] — nós desenvolvemos soluções simples para o dia a dia das equipes, e hoje apresentamos o VisionChef."*
2. **Slide 2 (`0:16–0:36`):** *"Em restaurantes pequenos, o dono e o cozinheiro controlam o estoque no caderno. Quando chega compra nova, os lotes antigos são empurrados para o fundo da geladeira. Os ingredientes vencem sem ninguém perceber, e o prejuízo só aparece no fechamento do mês. Nossa pergunta foi direta: como ajudar essa equipe a ver o que vence primeiro sem parar o preparo para folhear um caderno?"*
3. **Slide 3 (`0:36–0:54`):** *"Antes de pensar em tela ou código, montamos nossa Matriz CSD separando certezas, suposições e dúvidas. E escolhemos uma dúvida prioritária, a D1: na prática, como a equipe escolhe qual lote usar primeiro — e em que momento descobre que um insumo venceu?"*
4. **Slide 4 (`0:54–1:14`):** *"Na validação do problema, os relatos do cozinheiro e do dono deixaram o gargalo evidente: o caderno fica fora da cozinha, caneta apaga com a umidade da geladeira, lousa ninguém atualiza, e um sistema ERP no computador foi abandonado por ser caro e trabalhoso. Na cozinha pequena, a única ferramenta sempre à mão é o celular."*
5. **Slide 5 (`1:14–1:30`):** *"É aí que entra o VisionChef: simples como o caderno, inteligente como o PVPS — Primeiro que Vence, Primeiro que Sai. Em três passos no celular: primeiro, registra o lote em segundos — digitando, falando no microfone ou importando o XML da nota fiscal; segundo, ordena pelo vencimento com alertas visuais claros; e terceiro, dá baixa de uso ou descarte com um toque."*
   - **Cola rápida para não esquecer (Slide 5):** **PVPS** significa **Primeiro que Vence, Primeiro que Sai** *(em inglês, FEFO — First Expired, First Out)*. As 4 cores semânticas funcionam nos temas claro e escuro: **Vence hoje** (vermelho pulsando), **Em breve** (laranja), **No prazo** (azul) e **Vencido** (roxo/vinho).
6. **Slide 6 (`1:30–2:18` · vídeo `demo-visionchef.mp4` rodando automaticamente no slide):** *"[Pausa 1s para a banca olhar o vídeo no telão] Olha funcionando na prática aqui na tela. O cozinheiro bate o olho e vê no topo o que vence hoje pulsando em alerta. Se tentar cadastrar um item repetido ou uma data ambígua, o sistema avisa na hora. Se já venceu, bloqueia o uso por segurança sanitária e libera o descarte em um clique, visível imediatamente para o dono. E como plus de viabilidade, o Time SYNC já publicou o piloto no ar com assistente por voz, leitura de XML da NF-e, controle de equipe e 26 testes passando."*
7. **Slide 7 (`2:18–2:38`):** *"Por que isso funciona na realidade do Brasil? Roda no celular que a cozinha já tem, sem hardware caro. E nas notas fiscais de alimentos, o XML quase nunca traz a validade — por isso desenhamos um roadmap em três fases: Fase 1 já ativa no MVP lendo o XML e completando validades por voz; Fase 2 automática pela SEFAZ com Certificado A1 e QR Code; e Fase 3 lendo a validade direto pela câmera na embalagem."*
8. **Slide 8 (`2:38–2:50`):** *"VisionChef, do Time SYNC: para nenhum insumo vencer escondido no fundo da geladeira. [pausa 1s] O QR Code está na tela para vocês testarem agora as simulações, o microfone e a nota fiscal no celular. Muito obrigado!"*

---

## Guia de postura, palco, microfone e oratória

- **30 segundos antes de subir (Respiração 4–2–6):** inspire 4s, segure 2s, solte devagar 6s (2 ciclos) para baixar o batimento cardíaco.
- **Base e entrada:** suba firme, plante os dois pés no chão (largura dos ombros), olhe a banca, sorria brevemente e espere 1 segundo antes da primeira palavra.
- **Microfone em auditório (20 fileiras):** segure o microfone a **3–4 dedos da boca** em uma mão (nunca abaixe a mão do microfone ao gesticular!) e gesticule livremente com a outra mão na altura do peito.
- **Comece 10% mais devagar:** a adrenalina acelera os primeiros 15 segundos; ritmo firme e articulado (120–140 ppm / `0.90x`–`0.95x` no estúdio) garante nitidez até a última fileira.
- **3 pausas estratégicas de 1 segundo:** após o gancho (Slide 1), na entrada do vídeo (Slide 6) e antes do *"Muito obrigado!"* (Slide 8).
- **Truque dos 3 rostos:** escolha 3 rostos simpáticos (esquerda, banca ao centro, direita) e alterne o olhar entre eles como uma conversa real; nunca vire as costas para ler o telão.
- **Saída profissional:** termine firme no *"Muito obrigado!"* e aguarde 2 segundos sorrindo — **nunca** diga *"então é isso"*, *"era só isso pessoal"* ou peça desculpas.

## Como reagir a imprevistos

| Situação | Reação recomendada |
| --- | --- |
| **Branco rápido (2s)** | Não peça desculpa; olhe para o título do slide atual (sua âncora) e retome com suas palavras. |
| **Vídeo ou aba falhou** | Troque imediatamente para `E3-mvp-validade.html?demo=ux` (Aba reserva) dizendo: *"Para respeitar nossos 3 minutos, vou mostrar nossa versão local."* |
| **Cronômetro chegou em 2:35 no Slide 6** | Encerre a demonstração, entregue 1 frase do Slide 7 e garanta o fechamento firme no Slide 8 (nunca deixe o cronômetro cortar o final). |

## Respostas rápidas para a banca (Método P.R.E. — máx. 30s)

1. **Pausa** (ouça até o fim) → **Reconhece** (*"Ótima pergunta!"*) → **Entrega** objetiva e honesta:
   - ***"Por que não usar planilha ou um ERP já existente?"***  
     *"Na validação vimos que o dono testou ERP no PC e a equipe abandonou na segunda semana por custo e excesso de telas, e planilha no celular trava na correria do preparo. O VisionChef corta o excesso e resolve em segundos o que vence primeiro."*
   - ***"E se o cozinheiro esquecer de cadastrar na correria?"***  
     *"Por isso deixamos apenas dois campos obrigatórios — insumo e validade — e criamos também o preenchimento assistido por texto ou voz, onde a pessoa fala o lote e só confirma."*
   - ***"Vocês testaram com restaurantes reais?"***  
     *"Nesta etapa de treino, nossas entrevistas foram simuladas com foco na rotina real de cozinhas pequenas e validamos o sistema com 26 testes automatizados (concorrência, duplicidade, bloqueio de vencidos, NF-e XML e acesso de equipe). Nosso próximo passo imediato é rodar o teste de 20 minutos em cozinhas reais — o sistema já está no ar no QR Code pronto para isso."*
   - ***"Como vocês lidam com as notas fiscais (NF-e / NFC-e) na chegada das compras?"***  
     *"Mapeamos a realidade do Brasil: na NF-e existe o bloco `<rastro>` com lote e validade, mas em alimentos quase nenhum fornecedor preenche. Por isso implantamos em 3 fases: na Fase 1 (já rodando no MVP via QR Code), importamos o XML no navegador, aproveitamos `<rastro>` quando vem e a assistente por voz completa a validade; na Fase 2 conectamos automático na SEFAZ (DF-e com Certificado A1) e QR Code da NFC-e com De/Para; e na Fase 3 usamos a câmera/OCR direto na embalagem para compras sem XML, como hortifrúti."*
   - ***"Como isso se sustenta / gera receita?"***  
     *"No piloto rodamos em camadas gratuitas na nuvem (Vercel e Supabase), com custo quase zero. A hipótese pós-piloto é um modelo freemium: gratuito para 1 restaurante testar e assinatura mensal enxuta para múltiplos usuários, alertas diários e histórico estendido."*

## Treino express (15 minutos — 3 rodadas)

1. **Rodada 1 (só voz + cronômetro):** ler em voz alta adaptando qualquer palavra ao seu jeito natural.
2. **Rodada 2 (slides + vídeo do Slide 6 + cronômetro):** fechar entre **2min40s e 2min50s**.
3. **Rodada 3 (gravação no celular):** assistir 1 vez conferindo volume, ritmo e olhar para a câmera.
