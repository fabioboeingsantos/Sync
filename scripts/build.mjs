import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as compilarReact } from 'vite';

export const raiz = fileURLToPath(new URL('../', import.meta.url));

// Só entram na distribuição os recursos usados pela landing e pelas demonstrações públicas.
const tema = 'Insumo vencendo na cozinha';
// O OCR e o modelo português são servidos na mesma origem; nenhuma foto ou dependência é enviada a um CDN.
const arquivosOcr = [
  ['node_modules/tesseract.js/dist/tesseract.esm.min.js', 'ocr/tesseract.esm.min.js'],
  ['node_modules/tesseract.js/dist/worker.min.js', 'ocr/worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core.wasm.js', 'ocr/core/tesseract-core.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd.wasm.js', 'ocr/core/tesseract-core-simd.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'ocr/core/tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'ocr/core/tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/@tesseract.js-data/por/4.0.0_best_int/por.traineddata.gz', 'ocr/lang/por.traineddata.gz'],
  ['node_modules/tesseract.js/LICENSE.md', 'ocr/LICENSE-tesseract.js.txt'],
  ['node_modules/tesseract.js-core/LICENSE', 'ocr/LICENSE-tesseract.js-core.txt'],
  ['node_modules/@tesseract.js-data/por/README.md', 'ocr/README-idioma.txt'],
  ['node_modules/@tesseract.js-data/por/package.json', 'ocr/METADADOS-idioma.json'],
];
export const arquivosPublicos = [
  'informacoes.html',
  // A página social é independente e usa recursos locais próprios.
  'causa-social/index.html',
  'causa-social/styles.css',
  'causa-social/imagens/cesta-grande.webp',
  'causa-social/imagens/refeicao-compartilhada.png',
  'causa-social/app.js',
  'css/botoes.css',
  `${tema}/abertura/sync.css`,
  `${tema}/abertura/js/tema.js`,
  `${tema}/abertura/imagens/coruja-sync-icone.png`,
  `${tema}/abertura/imagens/sol-realista.webp`,
  `${tema}/abertura/imagens/lua-realista.webp`,
  `${tema}/abertura/imagens/LogoOficial.webp`,
  `${tema}/abertura/imagens/sync-emblema-animado.mp4`,
  `${tema}/imagens/visionchef-logo.jpg`,
  `${tema}/imagens/visionchef-logo-pictorica.png`,
  `${tema}/htmls/agente-ia-cadastro.html`,
  // A demonstração pública da Vision compartilha o interpretador e o microfone com o exemplar E3.
  `${tema}/htmls/interpretar-lote.js`,
  `${tema}/htmls/voice-pill.css`,
  `${tema}/htmls/voice-pill.js`,
  `${tema}/htmls/E3-mvp-validade.html`,
];

// Monta a landing e o estoque na mesma origem e escolhe o adaptador de dados de cada ambiente.
export async function montarPiloto({ destino = resolve(raiz, 'dist'), local = false } = {}) {
  // Segredos e URL do Supabase são lidos pelas funções Node em runtime, nunca pelo build do navegador.
  // Apaga sobras do build anterior, que ainda continha o cliente Supabase no navegador.
  if (!local) await Promise.all(['config.js', 'supabase.js'].map((arquivo) => rm(resolve(destino, arquivo), { force: true })));
  // Limpa apenas a pasta de imagens geradas da saída para não carregar PNGs grandes de builds anteriores.
  await rm(resolve(destino, 'imagens/produtos'), { recursive: true, force: true });
  // Cada módulo tem sua própria URL pública para manter navegação e sessão na mesma origem.
  const [landing, estoque, equipe, conta] = await Promise.all([
    readFile(resolve(raiz, 'index.html'), 'utf8'),
    readFile(resolve(raiz, 'piloto/index.html'), 'utf8'),
    readFile(resolve(raiz, 'piloto/equipe.html'), 'utf8'),
    readFile(resolve(raiz, 'piloto/conta.html'), 'utf8'),
  ]);
  const blocoContas = /\s*<!-- contas-ficticias-inicio -->([\s\S]*?)<!-- contas-ficticias-fim -->/;
  // A landing apresenta o produto; o módulo de acesso só responde a links diretos de confirmação ou recuperação.
  const paginaInicial = landing
    .replace('<!-- login-piloto-modulo -->', '<script type="module" src="entrada.js"></script>');
  const paginaEstoque = local ? estoque : estoque.replace(blocoContas, '');
  await Promise.all([
    mkdir(resolve(destino, 'causa-social/imagens'), { recursive: true }),
    mkdir(resolve(destino, 'estoque'), { recursive: true }),
    mkdir(resolve(destino, 'equipe'), { recursive: true }),
    mkdir(resolve(destino, 'conta'), { recursive: true }),
  ]);
  // Ignora avisos cosméticos da diretiva "use client" do framer-motion em bundles exclusivamente de navegador.
  const ignorarAvisoUseClient = (aviso, padrao) => {
    if (aviso.code === 'MODULE_LEVEL_DIRECTIVE' && String(aviso.message ?? '').includes('use client')) return;
    padrao(aviso);
  };
  await Promise.all([
    writeFile(resolve(destino, 'index.html'), paginaInicial),
    writeFile(resolve(destino, 'estoque/index.html'), paginaEstoque),
    writeFile(resolve(destino, 'equipe/index.html'), equipe),
    writeFile(resolve(destino, 'conta/index.html'), conta),
    compilarReact({
      root: raiz,
      configFile: false,
      logLevel: 'warn',
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: {
        outDir: resolve(destino),
        emptyOutDir: false,
        copyPublicDir: false,
        lib: { entry: resolve(raiz, 'frontend/entrada.jsx'), formats: ['es'], fileName: () => 'entrada.js' },
        // O adaptador continua externo ao bundle para usar o banco local ou o Supabase conforme o build.
        rolldownOptions: { external: ['./api.js'], onwarn: ignorarAvisoUseClient },
      },
    }),
    compilarReact({
      root: raiz,
      configFile: false,
      logLevel: 'warn',
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: {
        outDir: resolve(destino),
        emptyOutDir: false,
        copyPublicDir: false,
        lib: { entry: resolve(raiz, 'frontend/menu-estoque.jsx'), formats: ['es'], fileName: () => 'menu-estoque.js', cssFileName: 'menu-estoque' },
        rolldownOptions: { onwarn: ignorarAvisoUseClient },
      },
    }),
    cp(resolve(raiz, 'piloto/estoque.js'), resolve(destino, 'estoque.js')),
    cp(resolve(raiz, 'piloto/catalogo-estoque.js'), resolve(destino, 'catalogo-estoque.js')),
    cp(resolve(raiz, 'piloto/equipe.js'), resolve(destino, 'equipe.js')),
    cp(resolve(raiz, 'piloto/conta.js'), resolve(destino, 'conta.js')),
    cp(resolve(raiz, 'piloto/interpretar-lote.js'), resolve(destino, 'interpretar-lote.js')),
    cp(resolve(raiz, 'piloto/interpretar-nfe.js'), resolve(destino, 'interpretar-nfe.js')),
    cp(resolve(raiz, local ? 'scripts/api-local.js' : 'piloto/api.js'), resolve(destino, 'api.js')),
    cp(resolve(raiz, 'piloto/estoque.css'), resolve(destino, 'css/estoque.css')),
    cp(resolve(raiz, 'piloto/imagens/produtos'), resolve(destino, 'imagens/produtos'), { recursive: true }),
    ...arquivosOcr.map(async ([origem, saida]) => {
      const destinoArquivo = resolve(destino, saida);
      await mkdir(resolve(destinoArquivo, '..'), { recursive: true });
      await cp(resolve(raiz, origem), destinoArquivo);
    }),
    ...arquivosPublicos.map((arquivo) => cp(resolve(raiz, arquivo), resolve(destino, arquivo))),
  ]);
  // A folha de estilo do menu é servida sob /css como os demais estilos do piloto.
  await mkdir(resolve(destino, 'css'), { recursive: true });
  await cp(resolve(destino, 'menu-estoque.css'), resolve(destino, 'css/menu-estoque.css'));

}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await montarPiloto();
  console.log('Piloto integrado gerado em dist/.');
}
