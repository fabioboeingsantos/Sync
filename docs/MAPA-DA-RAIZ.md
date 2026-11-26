# Mapa da raiz do VisionChef

Inventário atualizado em 25/11/2026 do repositório `Sync`. A árvore lista os itens observados na raiz e abre os diretórios usados para desenvolver e documentar o piloto.

```text
Sync/
├── .dados-local/                banco, arquivos servidos e cache do ambiente local
├── .git/                       metadados do Git
├── .github/workflows/ci.yml    pipeline de CI (testes, build, checagem de segredos e audit)
├── api/                        funções Vercel Node para autenticação, sessão, health, estoque e equipe
├── css/                        estilo de botões compartilhado pelo piloto e pelo simulado
├── dist/                       saída gerada da versão integrada
├── docs/
│   ├── api/                    contrato OpenAPI 3.1 da API Node (api-contract.yaml)
│   ├── architecture/           desenho técnico, contexto, modelo de dados, ameaças e ADRs
│   ├── futuras-implantacoes/   evolução do piloto (incluindo integração de notas fiscais Fases 1–3) e divulgação da Sync
│   ├── implementation/         rastreabilidade de fases, requisitos e evidências (status.yaml)
│   ├── operations/             runbook operacional (deploy, rollback, rotação e restore)
│   ├── product/                escopo, requisitos funcionais/não funcionais e fluxos do piloto
│   └── MAPA-DA-RAIZ.md         inventário e dependências de caminhos
├── frontend/                   componente React de acesso e componentes GlassSurface, HorizonBloom e VoicePill (components/)
├── Insumo vencendo na cozinha/
│   ├── abertura/               estilos, tema e mídias da abertura da SYNC
│   ├── agente_IA/              documentação do protótipo de assistente e roadmap fiscal
│   ├── desafios/               entregas E1 a E5, protótipo local e Lean Canvas visual da E3
│   ├── docs/                   guia UC6 e referência da animação
│   ├── htmls/                  protótipos de estoque e cadastro assistido, com interpretador e microfone compartilhados
│   ├── imagens/                mídias específicas do tema
│   ├── pitch/                  slides, roteiro e estúdio de ensaio de voz (ensaio-voz.html)
│   └── documentos do tema      índice, persona, matriz CSD, regras e guia visual
├── node_modules/               dependências instaladas pelo npm
├── piloto/                     HTML, CSS, JavaScript (incluindo interpretar-nfe.js) e cliente Supabase do piloto
├── scripts/                    servidor local, banco de teste e geração de dist/
├── supabase/
│   ├── functions/              funções de servidor para login, limites e confirmação facultativa
│   ├── migrations/             alterações versionadas do banco em SQL
│   └── config.toml             configuração local do Supabase CLI e da função
├── tests/                      testes automatizados de estoque e migração local
├── site.txt                    endereço público da landing da Sync
├── .env.example                modelo das variáveis de ambiente do piloto
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

- **Piloto e build.** O [script de build](../scripts/build.mjs) monta a landing a partir de `index.html`, compila em Vite o [acesso em React](../frontend/entrada.jsx), monta `/estoque/` e `/equipe/` a partir de `piloto/` e publica as funções Node de `api/`. O backend consulta o Supabase e mantém a sessão em cookie HttpOnly. A versão integrada fica em `dist/`; a configuração privada é lida pelas funções em runtime. Os comandos estão no [manifesto npm](../package.json).
- **Ambiente local.** O [servidor](../scripts/dev.mjs) monta a página local e guarda os dados em `.dados-local/`. O [banco local](../scripts/banco-local.mjs) lê as migrações de `supabase/migrations/`, também usadas nos [testes de estoque](../tests/estoque.test.mjs) e nos [testes de equipe](../tests/equipe.test.mjs).
- **Primeiro acesso.** A [migração de restaurante inicial](../supabase/migrations/20261124001500_criar_restaurante_inicial.sql) cria o restaurante e o vínculo do dono na mesma transação. O fluxo começa no [diálogo de acesso](../frontend/entrada.jsx) e usa o mesmo procedimento no piloto local.
- **Simulado.** A [página inicial](../index.html) e a [página de informações](../informacoes.html) continuam na raiz como pontos de entrada. Os estilos da SYNC, o alternador de tema e as mídias da abertura ficam em [abertura/](<../Insumo vencendo na cozinha/abertura/>). As entregas, os guias e os protótipos estão organizados no [índice do simulado](<../Insumo vencendo na cozinha/README.md>).
- **Exemplar da E3.** O [protótipo interativo](<../Insumo vencendo na cozinha/desafios/E3-prototipo.html>) fica ao lado do roteiro do desafio. Carrega o [estilo global de botões](../css/botoes.css), as imagens locais, o [interpretador da Vision](<../Insumo vencendo na cozinha/htmls/interpretar-lote.js>) e o [microfone animado](<../Insumo vencendo na cozinha/htmls/voice-pill.js>), compartilhados com a demonstração pública de cadastro assistido.
- **Lean Canvas visual.** O [PDF](<../Insumo vencendo na cozinha/desafios/E3-lean-canvas-visual.pdf>) e a [imagem PNG](<../Insumo vencendo na cozinha/desafios/E3-lean-canvas-visual.png>) acompanham a seção Lean Canvas do [documento da E3](<../Insumo vencendo na cozinha/desafios/E3.md>).
- **Itens locais e gerados.** `.dados-local/`, `dist/`, `node_modules/`, `.env.local`, `.vercel/` e `supabase/.temp/`, quando existirem, estão cobertos pelo [.gitignore](../.gitignore). `.env.example` é o modelo compartilhado.

## Onde colocar mudanças

- Componentes React da landing em `frontend/`, funções de backend em `api/`, tela de estoque em `piloto/`, scripts em `scripts/`, migrações em `supabase/migrations/` e testes em `tests/`.
- Requisitos e telas em `docs/product/`, decisões técnicas em `docs/architecture/` e melhorias futuras em `docs/futuras-implantacoes/`.
- Materiais do simulado em `Insumo vencendo na cozinha/`. O estilo de botões usado pelos dois projetos fica em `css/botoes.css`.
- Ao criar, mover ou renomear um item listado, atualize este mapa e os caminhos afetados na mesma mudança. O [README](../README.md) é o ponto de entrada do repositório.
