# Regras do projeto

## Organização do repositório

Consulte o [mapa da raiz](docs/MAPA-DA-RAIZ.md) antes de criar pastas ou mover arquivos. Ao incluir, mover ou renomear um item listado no mapa, atualize o inventário e confira os caminhos afetados na mesma mudança.

## Comentários no código

Todo código novo ou alterado deve ser comentado em português. Explique, junto ao trecho relevante, a finalidade do arquivo, as regras de negócio, as decisões importantes e os detalhes que exigem contexto. Inclua scripts, testes, telas, estilos e migrações. Documente configurações de formatos sem suporte a comentários, como JSON, no README pertinente.

## Padrão global obrigatório para botões (GlassSurface + Paleta Aço Inox)

Todos os botões existentes e futuros criados em qualquer página ou componente deste projeto **devem** seguir a regra global **GlassSurface + Paleta Aço Inox** definida em `css/botoes.css` (e, em componentes React que precisem de refração SVG dedicada, usando `frontend/components/GlassSurface.jsx` baseado em `@react-bits/GlassSurface-JS-CSS`).

- **Folha de estilos:** importe `css/botoes.css` em toda página HTML que contenha botões e use sempre a classe base `.botao` combinada com `.botao-primario`, `.botao-secundario` ou `.botao-secundario.danger`.
- **Base GlassSurface (`.botao`):** altura mínima de `48px`, padding `12px 20px`, cantos arredondados de `12px`, borda translúcida `1px`, peso `700`, `gap: 8px`, `backdrop-filter: blur(11px) saturate(1.35)` com reflexo especular superior (`::after`), fallback sólido em `@supports not (backdrop-filter)` e transições de `160ms ease`.
- **Paleta oficial Aço Inox (`Insumo vencendo na cozinha/style-guide.md`):**
  - **Primário (`.botao.botao-primario`):** vidro Aço Inox (`rgba(42, 127, 142, 0.84)` → `rgba(15, 76, 92, 0.94)`), texto `#FFFFFF`, borda translúcida `rgba(168, 213, 221, 0.45)`, brilho interno superior e sombra suave `#0F4C5C`; no hover, intensifica o vidro e eleva `1px`.
  - **Secundário (`.botao.botao-secundario`):** vidro claro fosco (`rgba(255, 255, 255, 0.74)`), texto `#0F4C5C`, borda `rgba(42, 127, 142, 0.58)`; no hover e quando `aria-pressed="true"`, fundo vítreo `#A8D5DD` suave com borda `#0F4C5C`.
  - **Ações destrutivas (`.botao.botao-secundario.danger`):** mantém a base de vidro clara com texto e borda `#B3261E`.
- **Componente React (`frontend/components/GlassSurface.jsx`):** zero dependências externas (compatível com as props de `@react-bits/GlassSurface-JS-CSS`: `width`, `height`, `borderRadius`, `distortionScale`, `displace`, `backgroundOpacity`, `blur`, `saturation`, `redOffset`, `greenOffset`, `blueOffset`, `shape`, `backdrop`, `refraction`, `renderer`). Use para superfícies e botões React que exijam refração SVG real, mantendo sempre um `<button>`/`<a>` acessível por dentro.
- **Estados e acessibilidade obrigatórios:**
  - Foco por teclado (`:focus-visible`): contorno visível de `3px` usando `--btn-foco` (`#0F4C5C` em superfícies claras; `#A8D5DD` em cabeçalhos escuros).
  - Desabilitado (`:disabled` / `aria-disabled="true"`): `opacity: 0.65`, sem sombra e sem elevação.
  - Carregando (`aria-busy="true"` / `.is-loading` / `data-loading="true"`): manter o rótulo da ação visível, exibir spinner e bloquear cliques repetidos.
  - Respeitar `prefers-reduced-motion: reduce` (desliga distorção SVG, elevação e transições).
- **Exceção para controles compactos:** controles compactos (como botão `×` de fechar, olho da senha, estrelas, seletores de quantidade e alternador de tema) preservam suas dimensões próprias, aplicando o mesmo acabamento vítreo Aço Inox sem quebrar layout.
- **Proteção contra sobrescrita:** nunca crie regras globais genéricas de `button { ... }` que sobrescrevam `.botao-primario` ou `.botao-secundario`; quando precisar estilizar outros botões, use `button:not(.botao)` ou classes específicas.
