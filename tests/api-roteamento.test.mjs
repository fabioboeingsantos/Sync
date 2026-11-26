import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
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

test('cadastro exige pelo menos seis caracteres e domínio com MX de recebimento', async (t) => {
  // A simulação garante que e-mails recusados nunca chegam ao endpoint de cadastro do Supabase.
  const dns = t.mock.method(Resolver.prototype, 'resolveMx', async (dominio) => {
    if (dominio === 'nulo.test') return [{ exchange: '.', priority: 0 }];
    if (dominio === 'ausente.test' || dominio === 'falha.test') {
      throw Object.assign(new Error('Consulta DNS simulada.'), { code: dominio === 'ausente.test' ? 'ENOTFOUND' : 'ETIMEOUT' });
    }
    assert.equal(dominio, 'recebe.test');
    return [{ exchange: 'mx.recebe.test', priority: 10 }];
  });
  const chamadas = t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.pathname === '/functions/v1/limitar-autenticacao') return Response.json({ permitido: true });
    assert.equal(url.pathname, '/auth/v1/signup');
    return Response.json({ id: 'conta-de-teste' });
  });

  await comAmbienteApi({}, async () => {
    const cadastrar = (email, senha = 'abc123') => tratarApi(new Request('https://sync.test/api/auth/signup', {
      method: 'POST', headers: { Origin: 'https://sync.test', 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomeUsuario: 'teste', email, senha }),
    }));
    const senhaCurta = await cadastrar('teste@recebe.test', 'abc12');
    assert.equal(senhaCurta.status, 400);
    assert.match((await senhaCurta.json()).erro, /entre 6 e 128 caracteres/);
    assert.equal((await cadastrar('teste@recebe.test/extra')).status, 400);
    assert.equal(dns.mock.callCount(), 0);
    assert.equal((await cadastrar('teste@ausente.test')).status, 400);
    assert.equal((await cadastrar('teste@nulo.test')).status, 400);
    const falha = await cadastrar('teste@falha.test');
    assert.equal(falha.status, 503);
    assert.equal((await falha.json()).codigo, 'consulta_email_indisponivel');
    assert.equal((await cadastrar('teste@recebe.test')).status, 201);
    assert.equal(chamadas.mock.calls.filter(({ arguments: [url] }) => url.pathname === '/auth/v1/signup').length, 1);
  });
});

test('vercel.json reescreve /api/* para /api/index e redireciona /estoque e /equipe', async () => {
  // Evita trailingSlash global, que gera 308 em POST /api/*, mantendo /estoque/ e /equipe/ consistentes.
  const bruto = await readFile(new URL('../vercel.json', import.meta.url), 'utf8');
  const config = JSON.parse(bruto);
  assert.equal(config.trailingSlash, undefined);
  assert.deepEqual(config.redirects, [
    { source: '/estoque', destination: '/estoque/', permanent: true },
    { source: '/equipe', destination: '/equipe/', permanent: true },
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

test('verificação opcional funciona mesmo para conta criada direto em auth.users sem nomes_usuario', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());
  const novoId = '20000000-0000-4000-8000-000000000099';
  const hash = 'a'.repeat(64);
  await banco.query("insert into auth.users (id, email) values ($1, 'semperfil@piloto.test')", [novoId]);
  const { rows: [{ estado }] } = await banco.query('select public.estado_verificacao_email($1) as estado', [novoId]);
  assert.deepEqual(estado, { verificado: false, verificado_em: null });
  const { rows: [{ emitido }] } = await banco.query('select public.emitir_verificacao_email($1, $2) as emitido', [novoId, hash]);
  assert.equal(emitido, true);
  const { rows: [{ consumido }] } = await banco.query('select public.consumir_verificacao_email($1) as consumido', [hash]);
  assert.equal(consumido, true);
  const { rows: [{ depois }] } = await banco.query('select public.estado_verificacao_email($1) as depois', [novoId]);
  assert.equal(depois.verificado, true);
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
  const horizonJsx = await readFile(new URL('../frontend/components/HorizonBloom.jsx', import.meta.url), 'utf8');
  const landing = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const estoqueHtml = await readFile(new URL('../piloto/index.html', import.meta.url), 'utf8');
  assert.match(botoesCss, /backdrop-filter:\s*blur/);
  assert.match(botoesCss, /\.glass-surface/);
  assert.match(botoesCss, /#0F4C5C/i);
  assert.match(agents, /GlassSurface/);
  assert.match(glassJsx, /feDisplacementMap/);
  assert.match(horizonJsx, /prefers-reduced-motion/);
  assert.match(landing, /id="hero-horizon-bloom"/);
  assert.match(landing, /class="brand-name"/);
  assert.match(landing, /class="footer-brand"/);
  assert.match(landing, /aria-expanded="false"/);
  assert.match(estoqueHtml, /href="\.\.\/"/);
});

test('endpoints /api/health e /api/health/ready e pipeline CI atendem aos controles de operação', async () => {
  // Liveness precisa responder 200 mesmo sem variáveis privadas carregadas.
  const liveness = await tratarApi(new Request('https://sync.test/api/index?__rota=health', { method: 'GET' }));
  assert.equal(liveness.status, 200);
  const dadosLiveness = await liveness.json();
  assert.equal(dadosLiveness.status, 'ok');
  assert.equal(dadosLiveness.servico, 'visionchef-api');

  // Readiness sem variáveis obrigatórias deve responder 503 sem expor segredos.
  const antigoUrl = process.env.VISIONCHEF_SUPABASE_URL;
  delete process.env.VISIONCHEF_SUPABASE_URL;
  try {
    const readiness = await tratarApi(new Request('https://sync.test/api/index?__rota=health/ready', { method: 'GET' }));
    assert.equal(readiness.status, 503);
    const corpo = await readiness.json();
    assert.equal(corpo.status, 'degraded');
    assert.equal(corpo.dependencias.configuracao, 'erro');
  } finally {
    if (antigoUrl !== undefined) process.env.VISIONCHEF_SUPABASE_URL = antigoUrl;
  }

  // Confirma que a CI versionada executa npm ci, testes, build e auditoria.
  const ci = await readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm run build/);
  assert.match(ci, /npm audit/);
});

test('sessão persiste automaticamente por 7 dias com renovação deslizante e teto absoluto de 30 dias', async () => {
  const segredo = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const assinarTeste = (payload) => {
    const cabecalho = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const assinatura = createHmac('sha256', segredo).update(`${cabecalho}.${corpo}`).digest('base64url');
    return `${cabecalho}.${corpo}.${assinatura}`;
  };

  await comAmbienteApi({ JWT_EXPIRATION_MINUTES: '1440', JWT_SECRET_KEY: segredo }, async () => {
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = async (alvo) => {
      const textoUrl = String(alvo);
      if (textoUrl.includes('/functions/v1/limitar-autenticacao')) {
        return Response.json({ permitido: true, retry_after: 0 });
      }
      if (textoUrl.includes('/auth/v1/token?grant_type=password')) {
        return Response.json({
          access_token: 'supa-access',
          refresh_token: 'supa-refresh',
          expires_in: 3600,
          user: { id: '20000000-0000-4000-8000-000000000001', email: 'dono@piloto.test' },
        });
      }
      if (textoUrl.includes('/rest/v1/restaurantes')) {
        return Response.json([{ id: '10000000-0000-4000-8000-000000000001', nome: 'Restaurante piloto' }]);
      }
      if (textoUrl.includes('/auth/v1/logout')) {
        return new Response(null, { status: 204 });
      }
      return new Response(null, { status: 404 });
    };

    try {
      // 1. Login automático emite cookie HttpOnly persistente de 7 dias (604800s) sem exigir checkbox.
      const login = await tratarApi(new Request('https://sync.test/api/auth/login', {
        method: 'POST',
        headers: { Origin: 'https://sync.test', 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador: 'dono@piloto.test', senha: 'senha-ficticia-valida' }),
      }));
      assert.equal(login.status, 200);
      const cookieLogin = login.headers.get('set-cookie');
      assert.match(cookieLogin, /HttpOnly; SameSite=Strict; Max-Age=604800; Secure/);

      // 2. Sessão usada após 2 dias renova automaticamente o cookie deslizante (Max-Age ~7 dias).
      const agora = Math.floor(Date.now() / 1000);
      const tokenUsado = assinarTeste({
        iss: 'sync-visionchef',
        sub: '20000000-0000-4000-8000-000000000001',
        email: 'dono@piloto.test',
        access_token: 'supa-access',
        refresh_token: 'supa-refresh',
        auth_exp: agora + 3600,
        iat: agora - 2 * 86400,
        exp: agora + 5 * 86400,
        max_exp: agora + 28 * 86400,
      });
      const consulta = await tratarApi(new Request('https://sync.test/api/restaurantes', {
        method: 'GET',
        headers: { Cookie: `access_token=${tokenUsado}` },
      }));
      assert.equal(consulta.status, 200);
      const cookieRenovado = consulta.headers.get('set-cookie');
      assert.ok(cookieRenovado, 'Esperado Set-Cookie com renovação deslizante automática');
      assert.match(cookieRenovado, /Max-Age=604800/);

      // 3. Quando o teto absoluto (max_exp) vence, a sessão é encerrada com 401 e o cookie limpo.
      const tokenVencido = assinarTeste({
        iss: 'sync-visionchef',
        sub: '20000000-0000-4000-8000-000000000001',
        email: 'dono@piloto.test',
        access_token: 'supa-access',
        refresh_token: 'supa-refresh',
        auth_exp: agora + 3600,
        iat: agora - 31 * 86400,
        exp: agora + 86400,
        max_exp: agora - 60,
      });
      const expirada = await tratarApi(new Request('https://sync.test/api/restaurantes', {
        method: 'GET',
        headers: { Cookie: `access_token=${tokenVencido}` },
      }));
      assert.equal(expirada.status, 401);
      assert.match(expirada.headers.get('set-cookie'), /Max-Age=0/);

      // 4. Logout global chama /auth/v1/logout?scope=global e limpa o cookie atual.
      let urlLogoutChamada = '';
      const fetchAnterior = globalThis.fetch;
      globalThis.fetch = async (alvo, opcoes) => {
        if (String(alvo).includes('/auth/v1/logout')) urlLogoutChamada = String(alvo);
        return fetchAnterior(alvo, opcoes);
      };
      const logoutGlobal = await tratarApi(new Request('https://sync.test/api/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://sync.test', 'Content-Type': 'application/json', Cookie: `access_token=${tokenUsado}` },
        body: JSON.stringify({ escopo: 'global' }),
      }));
      assert.equal(logoutGlobal.status, 200);
      assert.deepEqual(await logoutGlobal.json(), { autenticado: false, escopo: 'global' });
      assert.match(urlLogoutChamada, /\/auth\/v1\/logout\?scope=global$/);
      assert.match(logoutGlobal.headers.get('set-cookie'), /Max-Age=0/);
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });

  // Confirma integração com o cofre nativo de senhas do navegador e opção de logout global.
  const entradaJsx = await readFile(new URL('../frontend/entrada.jsx', import.meta.url), 'utf8');
  const estoqueHtml = await readFile(new URL('../piloto/index.html', import.meta.url), 'utf8');
  assert.match(entradaJsx, /PasswordCredential/);
  assert.match(entradaJsx, /if \(temAcesso && !querCadastro\)/);
  assert.match(entradaJsx, /Sair de todos os dispositivos/);
  assert.match(estoqueHtml, /id="sair-todos-dispositivos"/);
});
