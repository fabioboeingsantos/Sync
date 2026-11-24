# Mapa da raiz do VisionChef

Inventário de 24/11/2026 do repositório `Sync`. A árvore lista os itens observados na raiz e abre os diretórios usados para desenvolver e documentar o piloto.

```text
Sync/
├── .dados-local/                banco, arquivos servidos e cache do ambiente local
├── .git/                       metadados do Git
├── css/                        estilo de botões compartilhado pelo piloto e pelo simulado
├── dist/                       saída gerada da versão integrada
├── docs/
│   ├── architecture/            desenho técnico e decisões de arquitetura
│   ├── futuras-implantacoes/    evolução do piloto e divulgação do portfólio da Sync
│   ├── product/                 escopo, requisitos e fluxos do piloto
│   └── MAPA-DA-RAIZ.md          inventário e dependências de caminhos
├── frontend/                   componente React usado no acesso da landing
├── Insumo vencendo na cozinha/
│   ├── abertura/               estilos, tema e mídias da abertura da SYNC
│   ├── agente_IA/              documentação do protótipo de assistente
│   ├── desafios/               entregas E1 a E5
│   ├── docs/                   guia UC6 e referência da animação
│   ├── htmls/                  protótipos de estoque e cadastro assistido
│   ├── imagens/                mídias específicas do tema
│   ├── pitch/                  slides e roteiro do simulado
│   └── documentos do tema      índice, persona, matriz CSD, regras e guia visual
├── node_modules/               dependências instaladas pelo npm
├── piloto/                     HTML, CSS, JavaScript e cliente Supabase do piloto
├── scripts/                    servidor local, banco de teste e geração de dist/
├── supabase/
│   ├── functions/              função de servidor para login por nome de usuário
│   ├── migrations/             alterações versionadas do banco em SQL
│   └── config.toml             configuração local do Supabase CLI e da função
├── tests/                      testes automatizados de estoque e migração local
├── .env.example                modelo de configuração pública do Supabase
├── .gitignore                  exclusões do Git
├── .vercelignore               exclusões para o envio à Vercel
├── AGENTS.md                   regras para trabalhar no repositório
├── index.html                  página inicial do simulado
├── informacoes.html            informações sobre a versão do simulado
├── package-lock.json           versões exatas das dependências npm
├── package.json                dependências e comandos do piloto
├── README.md                   entrada do repositório e instruções locais
└── vercel.json                 configuração do build e da saída na Vercel
```

## Dependências de caminhos

- **Piloto e build.** O [script de build](../scripts/build.mjs) monta a landing a partir de `index.html`, compila em Vite o [acesso em React](../frontend/entrada.jsx), monta `/estoque/` a partir de `piloto/` e copia o [estilo compartilhado de botões](../css/botoes.css). A versão integrada fica em `dist/`. Os comandos estão no [manifesto npm](../package.json).
- **Ambiente local.** O [servidor](../scripts/dev.mjs) monta a página local e guarda os dados em `.dados-local/`. O [banco local](../scripts/banco-local.mjs) lê as migrações de `supabase/migrations/`, também usadas nos [testes de estoque](../tests/estoque.test.mjs).
- **Simulado.** A [página inicial](../index.html) e a [página de informações](../informacoes.html) continuam na raiz como pontos de entrada. Os estilos da SYNC, o alternador de tema e as mídias da abertura ficam em [abertura/](<../Insumo vencendo na cozinha/abertura/>). As entregas, os guias e os protótipos estão organizados no [índice do simulado](<../Insumo vencendo na cozinha/README.md>).
- **Itens locais e gerados.** `.dados-local/`, `dist/`, `node_modules/`, `.env.local`, `.vercel/` e `supabase/.temp/`, quando existirem, estão cobertos pelo [.gitignore](../.gitignore). `.env.example` é o modelo compartilhado.

## Onde colocar mudanças

- Componentes React da landing em `frontend/`, tela de estoque em `piloto/`, scripts em `scripts/`, migrações em `supabase/migrations/` e testes em `tests/`.
- Requisitos e telas em `docs/product/`, decisões técnicas em `docs/architecture/` e melhorias futuras em `docs/futuras-implantacoes/`.
- Materiais do simulado em `Insumo vencendo na cozinha/`. O estilo de botões usado pelos dois projetos fica em `css/botoes.css`.
- Ao criar, mover ou renomear um item listado, atualize este mapa e os caminhos afetados na mesma mudança. O [README](../README.md) é o ponto de entrada do repositório.
