import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { tratarApi } from '../api/handler.js';
import { abrirBancoLocal, comoUsuario, contas } from '../scripts/banco-local.mjs';

// Mantém variáveis fictícias isoladas durante cada teste sem expor segredos reais.
async function comAmbienteApi(overrides, fn) {
  const chaves = [
    'VISIONCHEF_SUPABASE_URL', 'VISIONCHEF_SUPABASE_PUBLISHABLE_KEY', 'JWT_SECRET_KEY',
    'JWT_ALGORITHM', 'JWT_COOKIE_SECURE', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURITY',
    'SMTP_FROM', 'SMTP_USER', 'SMTP_PASSWORD',
  ];
  const anteriores = Object.fromEntries(chaves.map((chave) => [chave, process.env[chave]]));
  const padrao = {
    VISIONCHEF_SUPABASE_URL: 'https://exemplo.supabase.co',
    VISIONCHEF_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_teste_local',
    JWT_SECRET_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    JWT_ALGORITHM: 'HS256',
    JWT_COOKIE_SECURE: 'true',
    SMTP_HOST: 'smtp.exemplo.invalid',
    SMTP_PORT: '465',
    SMTP_SECURITY: 'SSL',
    SMTP_FROM: 'teste@exemplo.invalid',
    SMTP_USER: 'teste@exemplo.invalid',
    SMTP_PASSWORD: 'senha-ficticia-teste',
  };
  Object.assign(process.env, padrao, overrides);
  try {
    return await fn();
  } finally {
    for (const chave of chaves) {
      if (anteriores[chave] === undefined) delete process.env[chave];
      else process.env[chave] = anteriores[chave];
    }
  }
}

test('vercel.json reescreve /api/* para /api/index e redireciona apenas /estoque', async () => {
  // Evita trailingSlash global, que gera 308 em POST /api/*, mantendo /estoque/ consistente.
  const bruto = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');
  const config = JSON.parse(bruto);
  assert.equal(config.trailingSlash, undefined);
  assert.deepEqual(config.redirects, [
    { source: '/estoque', destination: '/estoque/', permanent: true },
  ]);
  assert.deepEqual(config.rewrites, [
    { source: '/api/:rota*', destination: '/api/index?__rota=:rota*' },
  ]);
});

test('tratarApi resolve rotas diretas, com barra final e reescritas via /api/index?__rota', async () => {
  await comAmbienteApi({}, async () => {
    // Sessão sem cookie deve retornar 200 com user null nos três formatos de URL.
    const urlsSessao = [
      'https://sync.test/api/auth/session',
      'https://sync.test/api/auth/session/',
      'https://sync.test/api/index?__rota=auth/session',
      'https://sync.test/api/index?__rota=auth/session/',
    ];
    for (const url of urlsSessao) {
      const resposta = await tratarApi(new Request(url, { method: 'GET' }));
      assert.equal(resposta.status, 200, `Esperado 200 para ${url}`);
      assert.deepEqual(await resposta.json(), { user: null, restaurantes: null });
    }

    // Login com corpo vazio deve chegar à validação de credenciais (401), nunca 404.
    const urlsLogin = [
      'https://sync.test/api/auth/login',
      'https://sync.test/api/auth/login/',
      'https://sync.test/api/index?__rota=auth/login',
    ];
    for (const url of urlsLogin) {
      const resposta = await tratarApi(new Request(url, {
        method: 'POST',
        headers: { Origin: 'https://sync.test', 'Content-Type': 'application/json' },
        body: '{}',
      }));
      assert.equal(resposta.status, 401, `Esperado 401 para ${url}`);
    }

    // Origem externa continua bloqueada mesmo passando pelo rewrite.
    const bloqueada = await tratarApi(new Request('https://sync.test/api/index?__rota=auth/login', {
      method: 'POST',
      headers: { Origin: 'https://outra-origem.test', 'Content-Type': 'application/json' },
      body: '{}',
    }));
    assert.equal(bloqueada.status, 403);
  });
});

test('configuração da API aceita espaços nas bordas e caixa alta em SMTP_SECURITY', async () => {
  await comAmbienteApi({
    JWT_ALGORITHM: ' HS256 \r\n',
    JWT_SECRET_KEY: ' 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\n',
    SMTP_PORT: ' 465 ',
    SMTP_SECURITY: ' SSL ',
  }, async () => {
    const resposta = await tratarApi(new Request('https://sync.test/api/index?__rota=auth/session'));
    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { user: null, restaurantes: null });
  });
});

test('email_cadastrado verifica existência no banco local e bloqueia acesso direto por authenticated', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());
  const { rows: [existente] } = await banco.query("select public.email_cadastrado('  DONO@piloto.test  ') as existe");
  const { rows: [inexistente] } = await banco.query("select public.email_cadastrado('naoexiste@piloto.test') as existe");
  assert.equal(existente.existe, true);
  assert.equal(inexistente.existe, false);
  const dono = contas.get('dono@piloto.test').id;
  await assert.rejects(
    comoUsuario(banco, dono, (tx) => tx.query("select public.email_cadastrado('dono@piloto.test')")),
    { code: '42501' },
  );
});

test('tela de estoque inclui diálogo Minha conta e opção de confirmação de e-mail', async () => {
  const html = await readFile(new URL('../piloto/index.html', import.meta.url), 'utf8');
  assert.match(html, /id="conta-topo"/);
  assert.match(html, /id="dialogo-conta"/);
  assert.match(html, /id="solicitar-confirmacao-email"/);
});

test('regra global de botões aplica GlassSurface com paleta Aço Inox e componente React disponível', async () => {
  const botoesCss = await readFile(new URL('../css/botoes.css', import.meta.url), 'utf8');
  const agents = await readFile(new URL('../AGENTS.md', import.meta.url), 'utf8');
  const glassJsx = await readFile(new URL('../frontend/components/GlassSurface.jsx', import.meta.url), 'utf8');
  const asciiJsx = await readFile(new URL('../frontend/components/AsciiStream.jsx', import.meta.url), 'utf8');
  const landing = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(botoesCss, /backdrop-filter:\s*blur/);
  assert.match(botoesCss, /\.glass-surface/);
  assert.match(botoesCss, /#0F4C5C/i);
  assert.match(agents, /GlassSurface/);
  assert.match(glassJsx, /feDisplacementMap/);
  assert.match(asciiJsx, /prefers-reduced-motion/);
  assert.match(landing, /id="hero-ascii-stream"/);
});
