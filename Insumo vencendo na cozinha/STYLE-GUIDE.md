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
| Destaque | `#E36414` | Atenção imediata | Fundo do rótulo **Vence hoje** com texto grafite. |
| Fundo | `#F4F6F7` | Fundo geral | Base da página e áreas de orientação, com texto grafite. |
| Alerta | `#B3261E` | Erros e lotes vencidos | Texto de validação e rótulo **Vencido** sobre fundo branco ou cinza claro. |

**Neutros de apoio:** branco `#FFFFFF` para cartões, campos e texto sobre a cor primária. Grafite `#182327` para texto principal e para texto sobre o laranja.

### Contraste para texto a 16 px

| Combinação | Contraste |
| --- | ---: |
| Branco sobre a primária | 9,51:1 |
| Secundária sobre branco | 4,64:1 |
| Grafite sobre o destaque laranja | 4,66:1 |
| Alerta sobre o fundo cinza | 6,03:1 |

Use grafite ou a cor primária para texto sobre o fundo cinza. Reserve a secundária para texto sobre branco. No destaque laranja, use grafite, pois branco sobre laranja fica em 3,44:1.

### Estados de validade

| Estado | Quando aparece | Rótulo e aplicação |
| --- | --- | --- |
| Vencido | A validade é anterior à data de referência. | **Vencido há 2 dias**, em vermelho alerta sobre branco. |
| Vence hoje | A validade coincide com a data de referência. | **Vence hoje**, em grafite sobre laranja. |
| Vence em breve | Faltam de 1 a 3 dias. | **Vence em 2 dias**, em azul secundário sobre branco. |
| Dentro do prazo | Faltam mais de 3 dias. | **Dentro do prazo**, em azul primário sobre branco. |

Exiba o estado por escrito e mantenha a data de validade visível. Em avisos de formulário, diga como corrigir o campo, por exemplo **Informe a validade do lote**.

## Espaçamento e componentes

- Use **8 px** entre elementos relacionados, **16 px** dentro de cartões e entre campos, e **24 px** entre seções.
- Mantenha botões e campos com **44 px de altura mínima**. Em telas estreitas, empilhe os componentes quando o conteúdo não couber lado a lado.
- **Botão principal:** fundo na cor primária, texto branco em negrito e cantos de 8 px. Use uma ação principal por bloco.
- **Botão secundário:** fundo branco, texto e borda na cor secundária. Exemplo **Ditar mensagem**.
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
  --cor-destaque: #e36414;
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
