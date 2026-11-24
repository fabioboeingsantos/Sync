import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
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
  `${tema}/abertura/imagens/sol-realista.jpg`,
  `${tema}/abertura/imagens/lua-realista.jpg`,
  `${tema}/abertura/imagens/LogoOficial.png`,
  `${tema}/abertura/imagens/sync-emblema-animado.mp4`,
  `${tema}/imagens/visionchef-logo.jpg`,
  `${tema}/htmls/agente-ia-cadastro.html`,
  `${tema}/htmls/E3-mvp-validade.html`,
];

// Monta a landing e o estoque na mesma origem e escolhe o adaptador de dados de cada ambiente.
export async function montarPiloto({ destino = resolve(raiz, 'dist'), local = false } = {}) {
  const supabaseUrl = local ? '' : process.env.VISIONCHEF_SUPABASE_URL?.trim();
  const chavePublica = local ? '' : process.env.VISIONCHEF_SUPABASE_PUBLISHABLE_KEY?.trim();

  // A versão integrada envia a configuração ao navegador, por isso exige uma chave publicável.
  if (!local && (!supabaseUrl?.startsWith('https://') || !chavePublica?.startsWith('sb_publishable_'))) {
    throw new Error('Informe a URL HTTPS e a chave sb_publishable_ do Supabase para gerar a versão integrada.');
  }

  const [landing, estoque] = await Promise.all([
    readFile(resolve(raiz, 'index.html'), 'utf8'),
    readFile(resolve(raiz, 'piloto/index.html'), 'utf8'),
  ]);
  const blocoContas = /\s*<!-- contas-ficticias-inicio -->([\s\S]*?)<!-- contas-ficticias-fim -->/;
  const contasLocais = local ? (estoque.match(blocoContas)?.[1] ?? '').replace('id="contas-locais" hidden', 'id="contas-locais"') : '';
  // O arquivo fonte aponta para o servidor local. Após o build, o fallback abre o estoque na própria origem.
  const paginaInicial = landing
    .replace('<!-- login-piloto-modulo -->', '<script type="module" src="entrada.js"></script>')
    .replace('<!-- login-piloto-contas -->', contasLocais)
    .replace('href="http://127.0.0.1:4173/#prototipos">Abrir login local', 'href="estoque/">Abrir tela de login');
  const paginaEstoque = local ? estoque : estoque.replace(blocoContas, '');
  await mkdir(resolve(destino, 'estoque'), { recursive: true });
  await Promise.all([
    writeFile(resolve(destino, 'index.html'), paginaInicial),
    writeFile(resolve(destino, 'estoque/index.html'), paginaEstoque),
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
    cp(resolve(raiz, local ? 'scripts/api-local.js' : 'piloto/api.js'), resolve(destino, 'api.js')),
    cp(resolve(raiz, 'piloto/estoque.css'), resolve(destino, 'css/estoque.css')),
    ...arquivosPublicos.map((arquivo) => cp(resolve(raiz, arquivo), resolve(destino, arquivo))),
  ]);

  if (!local) {
    // Reaproveita a distribuição oficial do SDK como um módulo da página estática.
    const pacote = resolve(raiz, 'node_modules/@supabase/supabase-js');
    const sdk = await readFile(resolve(pacote, 'dist/umd/supabase.js'), 'utf8');
    const configuracao = `export const url = ${JSON.stringify(supabaseUrl)};\n` +
      `export const chavePublica = ${JSON.stringify(chavePublica)};\n`;
    await Promise.all([
      writeFile(resolve(destino, 'config.js'), configuracao),
      writeFile(resolve(destino, 'supabase.js'), `${sdk}\nexport const createClient = supabase.createClient;\n`),
    ]);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await montarPiloto();
  console.log('Piloto integrado gerado em dist/.');
}
