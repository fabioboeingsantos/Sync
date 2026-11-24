# Regras do projeto

## Padrão obrigatório para botões (Cesta do Vale)

Todo botão novo criado em qualquer página ou componente deste projeto **deve** seguir o padrão visual da Cesta do Vale definido em `css/botoes.css`, usando a classe base `.botao` combinada com uma variante: `.botao-primario` ou `.botao-secundario`.

- **Folha de estilos:** importe `css/botoes.css` em toda página HTML que contenha botões.
- **Base (`.botao`):** altura mínima de `48px`, padding `12px 20px`, cantos arredondados de `10px`, borda `1px`, peso `600`, conteúdo centralizado com `gap: 8px` (para ícone + texto) e transições de `160ms ease` (`background-color`, `border-color`, `box-shadow`, `transform`).
- **Primário (`.botao.botao-primario`):** usar para a ação principal (ex.: *Salvar lote*, *Acessar VisionChef*). Gradiente de `135deg` de `#2F6B3B` a `#1F4D2E`, texto `#FFFFFF`, borda `#1F4D2E`, sombra suave com brilho interno; no hover, fundo sólido `#1F4D2E`, sombra intensificada e elevação de `1px`.
- **Secundário (`.botao.botao-secundario`):** usar para ações alternativas (ex.: *Voltar*, *Cancelar edição*, filtros). Fundo `#FFFFFF`, texto `#1F4D2E`, borda `#2F6B3B`; no hover e quando alternador ativo (`aria-pressed="true"`), fundo verde-claro `#E8F3EB` com sombra suave.
- **Ações destrutivas:** usar `.botao.botao-secundario.danger` (mantendo o fundo claro em repouso e hover suave em alerta).
- **Estados e acessibilidade obrigatórios:**
  - Foco por teclado (`:focus-visible`): contorno visível de `3px` usando o token `--btn-foco` (`#1F4D2E` no tema claro, adaptado ao contraste no tema escuro).
  - Desabilitado (`:disabled` / `aria-disabled="true"`): `opacity: 0.65`, sem sombra e sem elevação.
  - Carregando (`aria-busy="true"` / `.is-loading` / `data-loading="true"`): manter o rótulo da ação visível, exibir spinner e bloquear cliques repetidos.
  - Respeitar `prefers-reduced-motion: reduce` (sem elevação e sem transições).
- **Exceção para controles compactos:** preserve as dimensões próprias de controles compactos como estrelas, seletores de quantidade, links de barra superior e alternadores de tema.
- **Proteção contra sobrescrita:** nunca crie regras globais genéricas de `button { ... }` que sobrescrevam `.botao-primario` ou `.botao-secundario`; quando precisar estilizar outros botões, use `button:not(.botao)`.
