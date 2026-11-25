# Guia de estilo — Insumo vencendo na cozinha

Use este guia nas versões manual e com assistente integrado do controle de validade. A interface usa **Arial a 16 px** e a paleta **Aço inox** em todas as telas.

## Tipografia

| Elemento | Tamanho | Peso | Entrelinha |
| --- | --- | --- | --- |
| Texto, instruções e mensagens do chat | 16 px | Regular (400) | 1,5 |
| Títulos de página e de seção | 16 px | Negrito (700) | 1,5 |
| Rótulos, botões e estados do estoque | 16 px | Negrito (700) | 1,5 |
| Campos, datas e informações secundárias | 16 px | Regular (400) | 1,5 |

- Use `Arial, sans-serif`. A segunda opção permite que o sistema substitua Arial quando ela não estiver instalada.
- Diferencie títulos e seções pelo negrito, pelo espaço acima e pela estrutura semântica de `h1`, `h2` e `h3`.
- Comece rótulos e botões com maiúscula. Use verbos claros em ações, como **Salvar lote** e **Ditar mensagem**.
- Use `1rem` nos componentes para acompanhar a preferência de tamanho do navegador. Com a configuração padrão de 16 px, `1rem` equivale a 16 px.

## Paleta Aço inox

| Cor | HEX | Papel na interface | Aplicação |
| --- | --- | --- | --- |
| Primária | `#0F4C5C` | Marca, ação principal e foco | Cabeçalho, botão **Salvar lote** e mensagens do usuário com texto branco. Use também em links e contornos de foco. |
| Secundária | `#2A7F8E` | Ações secundárias e bordas | Texto e borda de botões com fundo branco. Use nas bordas dos campos e no marcador **Vence em breve**. |
| Destaque | `#A8D5DD` | Atenção imediata | Fundo azul-petróleo claro do rótulo **Vence hoje** com texto grafite. |
| Fundo | `#F4F6F7` | Fundo geral | Base da página e áreas de orientação, com texto grafite. |
| Alerta | `#B3261E` | Erros e lotes vencidos | Texto de validação e rótulo **Vencido** sobre fundo branco ou cinza claro. |

**Neutros de apoio:** branco `#FFFFFF` para cartões, campos e texto sobre a cor primária. Grafite `#182327` para texto principal e para texto sobre o destaque.

### Contraste para texto a 16 px

| Combinação | Contraste |
| --- | ---: |
| Branco sobre a primária | 9,51:1 |
| Secundária sobre branco | 4,64:1 |
| Grafite sobre o destaque | 10,11:1 |
| Alerta sobre o fundo cinza | 6,03:1 |

Use grafite ou a cor primária para texto sobre o fundo cinza. Reserve a secundária para texto sobre branco. Use grafite para texto sobre o destaque.

### Estados de validade (temas escuro e claro)

Todas as telas (landing page, sistema `/estoque/` e demonstrações) aplicam a mesma semântica de **4 estados** na barra lateral, borda, fundo sutil, etiqueta (badge) e botões de filtro, nos temas **escuro e claro**:

| Estado | Quando aparece | Cor semântica (Escuro / Claro) | Comportamento visual |
| --- | --- | --- | --- |
| **Vencido** | A validade é anterior à data de referência. | **Roxo / Vinho** (`#C084FC` / `#7E22CE`) | Estático — diferencia item já expirado (bloqueado para uso, pronto para descarte) do alerta urgente de hoje. |
| **Vence hoje** | A validade coincide com a data de referência. | **Vermelho alerta vivo** (`#EF4444` / `#DC2626`) | **Pulsando em alerta** (borda, halo vermelho, badge e filtro), indicando última chance de aproveitar antes de perder. |
| **Vence em breve** | Faltam de 1 a 3 dias. | **Laranja / Âmbar** (`#F97316` / `#EA580C`) | Estático — sinaliza atenção próxima para priorizar saída. |
| **Dentro do prazo / Em dia** | Faltam mais de 3 dias. | **Azul / Ciano** (`#38BDF8` / `#0284C7`) | Estático — estado saudável alinhado à identidade Aço Inox. |

Exiba sempre o estado por escrito junto com a cor e mantenha a data de validade visível. Em avisos de formulário (como data ambígua ou **lote repetido**), informe como corrigir ou decidir (ex.: **Editar lote existente** ou **Adicionar mesmo assim**). Respeite `prefers-reduced-motion: reduce`.

## Espaçamento e componentes

- Use **8 px** entre elementos relacionados, **16 px** dentro de cartões e entre campos, e **24 px** entre seções.
- Mantenha botões e campos com **44 px de altura mínima**. Em telas estreitas, empilhe os componentes quando o conteúdo não couber lado a lado.
- **Botão principal:** fundo na cor primária (acabamento GlassSurface), texto branco em negrito e cantos de 12 px. Use uma ação principal por bloco.
- **Botão secundário:** vidro fosco Aço Inox adaptável ao tema claro e escuro. Nos filtros de validade, assume a cor semântica de cada status.
- **Controle de voz (VoicePill):** substitui o botão textual de ditado pelo ícone de microfone expansível (`VoicePill`) com forma de onda animada, cronômetro e gesto *arraste para cancelar*.
- **Campo:** rótulo visível acima, fundo branco, texto grafite e borda na cor secundária. Em caso de erro, mostre a mensagem em vermelho abaixo do campo.
- **Cartão de lote:** fundo branco. Mostre nome do insumo, código, data e rótulo de validade. Exemplo **Queijo · lote B02 · 25/11/2026 · Vence em 2 dias**, considerando 23/11/2026 como referência.
- **Mensagens do assistente:** use fundo cinza claro com texto grafite. Para destacar a entrada do usuário, use fundo na cor primária com texto branco.
- **Foco por teclado:** use contorno na cor primária sobre superfícies claras e branco sobre superfícies na cor primária. Afaste o contorno 2 px do controle.

## CSS de referência

```css
:root {
  font-family: Arial, sans-serif;
  line-height: 1.5;

  --cor-primaria: #0f4c5c;
  --cor-secundaria: #2a7f8e;
  --cor-destaque: #a8d5dd;
  --cor-fundo: #f4f6f7;
  --cor-alerta: #b3261e;
  --cor-superficie: #ffffff;
  --cor-texto: #182327;
}

body {
  background: var(--cor-fundo);
  color: var(--cor-texto);
}

h1, h2, h3, button, input, select, textarea {
  font-family: inherit;
  font-size: 1rem;
  line-height: inherit;
}

button, input, select, textarea {
  box-sizing: border-box;
  min-block-size: 2.75rem;
}

:focus-visible {
  outline: 2px solid var(--cor-primaria);
  outline-offset: 2px;
}
```

O GitHub renderiza este Markdown com o estilo da própria plataforma. Use o CSS de referência para aplicar Arial e o tamanho padrão de 16 px nas páginas HTML do sistema.
