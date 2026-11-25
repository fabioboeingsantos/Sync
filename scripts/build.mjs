import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as compilarReact } from 'vite';

export const raiz = fileURLToPath(new URL('../', import.meta.url));

// Só entram na distribuição os recursos usados pela landing e pelas demonstrações públicas.
const tema = 'Insumo vencendo na cozinha';
export const arquivosPublicos = [
  'informacoes.html',
  'css/botoes.css',
  `${tema}/abertura/sync.css`,
  `${tema}/abertura/js/tema.js`,
  `${tema}/abertura/imagens/coruja-sync-icone.png`,
  `${tema}/abertura/imagens/sol-realista.webp`,
  `${tema}/abertura/imagens/lua-realista.webp`,
  `${tema}/abertura/imagens/LogoOficial.webp`,
  `${tema}/abertura/imagens/sync-emblema-animado.mp4`,
  `${tema}/imagens/visionchef-logo.jpg`,
  `${tema}/htmls/agente-ia-cadastro.html`,
  `${tema}/htmls/E3-mvp-validade.html`,
];

// Monta a landing e o estoque na mesma origem e escolhe o adaptador de dados de cada ambiente.
export async function montarPiloto({ destino = resolve(raiz, 'dist'), local = false } = {}) {
  // Segredos e URL do Supabase são lidos pelas funções Node em runtime, nunca pelo build do navegador.
  // Apaga sobras do build anterior, que ainda continha o cliente Supabase no navegador.
  if (!local) await Promise.all(['config.js', 'supabase.js'].map((arquivo) => rm(resolve(destino, arquivo), { force: true })));
  const [landing, estoque, equipe] = await Promise.all([
    readFile(resolve(raiz, 'index.html'), 'utf8'),
    readFile(resolve(raiz, 'piloto/index.html'), 'utf8'),
    readFile(resolve(raiz, 'piloto/equipe.html'), 'utf8'),
  ]);
  const blocoContas = /\s*<!-- contas-ficticias-inicio -->([\s\S]*?)<!-- contas-ficticias-fim -->/;
  const contasLocais = local ? (estoque.match(blocoContas)?.[1] ?? '').replace('id="contas-locais" hidden', 'id="contas-locais"') : '';
  // O arquivo fonte aponta para o servidor local. Após o build, o fallback abre o estoque na própria origem.
  const paginaInicial = landing
    .replace('<!-- login-piloto-modulo -->', '<script type="module" src="entrada.js"></script>')
    .replace('<!-- login-piloto-contas -->', contasLocais)
    .replace('href="http://127.0.0.1:8080/#prototipos">Abrir login local', 'href="estoque/">Abrir tela de login');
  const paginaEstoque = local ? estoque : estoque.replace(blocoContas, '');
  await Promise.all([
    mkdir(resolve(destino, 'estoque'), { recursive: true }),
    mkdir(resolve(destino, 'equipe'), { recursive: true }),
  ]);
  await Promise.all([
    writeFile(resolve(destino, 'index.html'), paginaInicial),
    writeFile(resolve(destino, 'estoque/index.html'), paginaEstoque),
    writeFile(resolve(destino, 'equipe/index.html'), equipe),
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
        rolldownOptions: { external: ['./api.js'] },
      },
    }),
    cp(resolve(raiz, 'piloto/estoque.js'), resolve(destino, 'estoque.js')),
    cp(resolve(raiz, 'piloto/equipe.js'), resolve(destino, 'equipe.js')),
    cp(resolve(raiz, 'piloto/interpretar-lote.js'), resolve(destino, 'interpretar-lote.js')),
    cp(resolve(raiz, 'piloto/interpretar-nfe.js'), resolve(destino, 'interpretar-nfe.js')),
    cp(resolve(raiz, local ? 'scripts/api-local.js' : 'piloto/api.js'), resolve(destino, 'api.js')),
    cp(resolve(raiz, 'piloto/estoque.css'), resolve(destino, 'css/estoque.css')),
    ...arquivosPublicos.map((arquivo) => cp(resolve(raiz, arquivo), resolve(destino, arquivo))),
  ]);

}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await montarPiloto();
  console.log('Piloto integrado gerado em dist/.');
}
