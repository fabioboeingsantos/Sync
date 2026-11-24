import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import {
  abrirBancoLocal, cadastrarLote, comoUsuario, contas, corrigirValidade, listarEstoque,
  outroRestaurante, registrarAbertura, restaurantePiloto, senhaLocal,
} from '../scripts/banco-local.mjs';
import { criarServidorLocal } from '../scripts/dev.mjs';
import { montarPiloto } from '../scripts/build.mjs';
import { criarLoginUsuario } from '../supabase/functions/login-usuario/handler.js';

// O banco descartável aplica a mesma migração usada pela versão integrada.
let banco;
before(async () => { banco = await abrirBancoLocal(); });
after(async () => { await banco?.close(); });

function lote(dados = {}) {
  return {
    p_restaurante_id: restaurantePiloto,
    p_insumo: 'Leite',
    p_codigo_fabricante: 'ABC123',
    p_validade: '2030-02-01',
    p_medida: 'L',
    p_quantidade: '1.25',
    p_operacao_id: randomUUID(),
    ...dados,
  };
}

test('dono e cozinheiro compartilham o estoque em ordem de validade, incluindo correções', async (t) => {
  // Cada cookie representa uma sessão independente. As leituras passam pelas rotas que a tela usa no modo local.
  const temporarios = resolve(tmpdir());
  const prefixo = 'visionchef-teste-';
  const pastaPublica = await mkdtemp(join(temporarios, prefixo));
  t.after(async () => {
    // A limpeza recursiva vale apenas para o diretório temporário criado acima.
    assert.equal(dirname(resolve(pastaPublica)), temporarios);
    assert.ok(basename(pastaPublica).startsWith(prefixo));
    await rm(pastaPublica, { recursive: true, force: true });
  });
  await montarPiloto({ destino: pastaPublica, local: true });
  const servidor = criarServidorLocal(banco, pastaPublica);
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const origem = `http://127.0.0.1:${servidor.address().port}`;

  // A landing, a autenticação e o estoque são servidos pelo mesmo endereço base.
  const htmlLanding = await (await fetch(`${origem}/`)).text();
  assert.match(htmlLanding, /id="prototipos"/);
  assert.match(htmlLanding, /id="acesso-visionchef"/);
  assert.match(htmlLanding, /id="acesso-estoque" href="estoque\/"/);
  assert.match(htmlLanding, /<script type="module" src="entrada\.js"><\/script>/);
  // A versão aberta pelo arquivo mantém um caminho para a mesma seção no servidor local.
  const htmlArquivo = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(htmlArquivo, /href="http:\/\/127\.0\.0\.1:4173\/#prototipos"/);
  const moduloEntrada = await fetch(`${origem}/entrada.js`);
  assert.equal(moduloEntrada.status, 200);
  const codigoEntrada = await moduloEntrada.text();
  assert.match(codigoEntrada, /from\s*["']\.\/api\.js["']/);
  assert.match(codigoEntrada, /createRoot/);
  assert.match(codigoEntrada, /identificador/);
  const estoqueInicial = await fetch(`${origem}/estoque`);
  assert.equal(estoqueInicial.url, `${origem}/estoque/`);
  assert.match(await estoqueInicial.text(), /id="aplicacao"/);
  assert.equal((await fetch(`${origem}/css/botoes.css`)).status, 200);
  const demonstracao = '/Insumo%20vencendo%20na%20cozinha/htmls/E3-mvp-validade.html';
  assert.equal((await fetch(`${origem}${demonstracao}`)).status, 200);

  async function chamada(caminho, { cookie, dados } = {}) {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (dados) {
      headers['Content-Type'] = 'application/json';
      headers.Origin = origem;
    }
    return fetch(`${origem}/demo/${caminho}`, {
      method: dados ? 'POST' : 'GET', headers, body: dados ? JSON.stringify(dados) : undefined,
    });
  }

  async function entrar(identificador) {
    const resposta = await chamada('entrar', { dados: { identificador, senha: senhaLocal } });
    assert.equal(resposta.status, 200);
    const cookie = resposta.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly; SameSite=Strict/);
    return cookie.split(';')[0];
  }

  const caminho = `lotes?restaurante=${restaurantePiloto}`;
  assert.equal((await chamada(caminho)).status, 401);

  const dono = await entrar('dono@piloto.test');
  const cozinheiro = await entrar('  Cozinha.PILOTO  ');
  const outroDono = await entrar('dono.outro');
  const restaurantes = await (await chamada('restaurantes', { cookie: dono })).json();
  assert.equal(restaurantes[0].id, restaurantePiloto);
  assert.deepEqual(await (await chamada('restaurantes', { cookie: cozinheiro })).json(), restaurantes);
  const identificadorInexistente = await chamada('entrar', { dados: { identificador: 'cozinha.inexistente', senha: senhaLocal } });
  const senhaIncorreta = await chamada('entrar', { dados: { identificador: 'cozinha.piloto', senha: 'senha-incorreta' } });
  assert.equal(identificadorInexistente.status, 401);
  assert.equal(senhaIncorreta.status, 401);
  assert.deepEqual(await identificadorInexistente.json(), await senhaIncorreta.json());
  // Cadastra em ordem inversa de vencimento para provar que a consulta ordena por data.
  const primeiro = await chamada('lotes', { cookie: dono, dados: lote() });
  const segundo = await chamada('lotes', {
    cookie: cozinheiro,
    dados: lote({ p_insumo: 'Queijo', p_validade: '2030-01-31', p_medida: 'kg' }),
  });
  assert.equal(primeiro.status, 200);
  assert.equal(segundo.status, 200);

  const outraConsulta = await chamada(caminho, { cookie: cozinheiro });
  const estoque = await outraConsulta.json();
  assert.deepEqual(estoque.map(({ insumo, saldo }) => [insumo, saldo]), [['Queijo', '1.25'], ['Leite', '1.25']]);
  assert.deepEqual(estoque.map(({ validade_aplicavel }) => validade_aplicavel), ['2030-01-31', '2030-02-01']);
  assert.deepEqual(await (await chamada(caminho, { cookie: dono })).json(), estoque);
  assert.deepEqual(await (await chamada(caminho, { cookie: outroDono })).json(), []);
  assert.equal((await chamada('lotes', { cookie: outroDono, dados: lote() })).status, 403);

  // O cozinheiro corrige o lote do dono. Uma nova leitura mantém os identificadores e o saldo.
  const original = estoque[1];
  const dados = {
    p_restaurante_id: restaurantePiloto,
    p_lote_id: original.lote_id,
    p_validade: '2030-01-30',
    p_revisao: original.revisao_validade,
  };
  const corrigir = (cookie, correcao = dados) => chamada('lotes/validade', { cookie, dados: correcao });
  assert.equal((await corrigir(outroDono)).status, 403);
  assert.equal((await corrigir(outroDono, { ...dados, p_restaurante_id: outroRestaurante })).status, 404);
  const corrigido = await corrigir(cozinheiro);
  assert.equal(corrigido.status, 200);
  assert.equal(await corrigido.json(), original.lote_id);

  // O reenvio da mesma correção é seguro, enquanto uma edição desatualizada recebe conflito.
  assert.equal((await corrigir(cozinheiro)).status, 200);
  const conflito = await corrigir(dono, { ...dados, p_validade: '2030-02-02' });
  assert.equal(conflito.status, 409);
  assert.equal((await conflito.json()).codigo, 'PT409');
  const novoEstoque = await (await chamada(caminho, { cookie: dono })).json();
  assert.equal(novoEstoque.length, 2);
  assert.deepEqual(novoEstoque[0], {
    ...original, validade_aplicavel: '2030-01-30', validade_embalagem: '2030-01-30', revisao_validade: 1,
  });
  assert.deepEqual(novoEstoque[1], estoque[0]);

  assert.equal((await corrigir(dono, { ...dados, p_validade: null, p_revisao: 1 })).status, 400);
  assert.equal((await corrigir(dono, { ...dados, p_validade: '2030-02-02', p_revisao: 1 })).status, 200);
  const resultado = await (await chamada(caminho, { cookie: cozinheiro })).json();
  assert.deepEqual(resultado.map(({ validade_aplicavel }) => validade_aplicavel), ['2030-01-31', '2030-02-02']);

  // Exercita a rota usada pelo formulário também com uma quantidade fracionária em litros.
  const { rows: [{ hoje }] } = await banco.query("select ((now() at time zone 'America/Sao_Paulo')::date)::text as hoje");
  const respostaAbertura = await chamada('lotes/abertura', { cookie: cozinheiro, dados: {
    p_restaurante_id: restaurantePiloto, p_lote_id: original.lote_id, p_parte_id: original.parte_id,
    p_quantidade: '0.5', p_data_abertura: hoje, p_validade_abertura: hoje, p_operacao_id: randomUUID(),
  } });
  assert.equal(respostaAbertura.status, 200);
  const estoqueDepois = await (await chamada(caminho, { cookie: dono })).json();
  const partes = estoqueDepois.filter((parte) => parte.lote_id === original.lote_id);
  assert.deepEqual(partes.map(({ saldo, data_abertura }) => [saldo, data_abertura]), [['0.5', hoje], ['0.75', null]]);

  await chamada('sair', { cookie: cozinheiro, dados: {} });
  assert.equal((await chamada(caminho, { cookie: cozinheiro })).status, 401);
});

test('cadastro repetido retorna o mesmo lote e bloqueia a reutilização da chave com outros dados', async () => {
  const dono = contas.get('dono@outro.test').id;
  const dados = lote({ p_restaurante_id: outroRestaurante });
  const registrar = (entrada) => comoUsuario(banco, dono, (tx) => cadastrarLote(tx, entrada));
  const primeiro = await registrar(dados);
  assert.equal(await registrar(dados), primeiro);
  await assert.rejects(registrar({ ...dados, p_quantidade: '2' }), { code: '23505' });
  // Uma correção de validade preserva os dados usados para reconhecer o reenvio do cadastro inicial.
  await comoUsuario(banco, dono, (tx) => tx.query('select public.corrigir_validade($1, $2, $3, 0)', [
    outroRestaurante, primeiro, '2030-02-03',
  ]));
  assert.equal(await registrar(dados), primeiro);
  const estoque = await comoUsuario(banco, dono, (tx) => listarEstoque(tx, outroRestaurante));
  assert.deepEqual(estoque.map(({ lote_id, saldo }) => [lote_id, saldo]), [[primeiro, '1.25']]);
  assert.equal(estoque[0].validade_aplicavel, '2030-02-03');
});

test('PostgreSQL rejeita unidades fracionárias, saldo inicial zero e escrita direta em lote existente', async () => {
  // As regras do banco valem também para chamadas que não passam pelo formulário.
  const dono = contas.get('dono@piloto.test').id;
  const registrar = (entrada) => comoUsuario(banco, dono, (tx) => cadastrarLote(tx, entrada));
  await assert.rejects(registrar(lote({ p_medida: 'un', p_quantidade: '1.25' })), { code: '23514' });
  await assert.rejects(registrar(lote({ p_quantidade: '0' })), { code: '23514' });
  await assert.rejects(comoUsuario(banco, dono, (tx) => tx.query("update public.lotes set insumo = 'Outro'")), { code: '42501' });
  await assert.rejects(comoUsuario(banco, dono, (tx) => tx.query('update public.membros_restaurante set ativo = false')), { code: '42501' });
});

test('nomes de usuário são únicos entre restaurantes e a consulta de e-mail é privada', async () => {
  const dono = contas.get('dono@piloto.test').id;
  const outro = contas.get('dono@outro.test').id;
  // Testa a restrição no banco, inclusive quando as duas contas pertencem a restaurantes distintos.
  await assert.rejects(banco.query('update public.nomes_usuario set nome_usuario = $1 where usuario_id = $2', [
    'Dono.PILOTO', outro,
  ]), { code: '23505' });
  await assert.rejects(comoUsuario(banco, dono, (tx) => tx.query('select * from public.nomes_usuario')), { code: '42501' });
  await assert.rejects(comoUsuario(banco, dono, (tx) => tx.query('select public.email_para_nome_usuario($1)', [
    'dono.piloto',
  ])), { code: '42501' });
});

test('a função de login por usuário resolve a conta no servidor e retorna apenas a sessão', async () => {
  const origem = 'https://visionchef.test';
  const requisicoes = [];
  const handler = criarLoginUsuario({
    url: 'https://banco.test', chavePublica: 'sb_publishable_teste', chaveServidor: 'sb_secret_teste',
    origens: new Set([origem]),
    // Simula as respostas do serviço de autenticação sem alcançar um projeto Supabase real.
    solicitar: async (url, opcoes) => {
      const dados = JSON.parse(opcoes.body);
      requisicoes.push({ caminho: url.pathname, dados, apikey: opcoes.headers.apikey });
      if (url.pathname.startsWith('/rest/')) {
        return Response.json(dados.p_nome_usuario === 'dono.piloto' ? 'dono@piloto.test' : null);
      }
      if (dados.email === 'dono@piloto.test' && dados.password === senhaLocal) {
        return Response.json({ access_token: 'token-teste', refresh_token: 'renovacao-teste', user: { email: dados.email } });
      }
      return Response.json({ message: 'Invalid login credentials' }, { status: 400 });
    },
  });
  const enviar = (nome, senha, origemDoPedido = origem) => handler(new Request('https://banco.test/functions/v1/login-usuario', {
    method: 'POST', headers: { Origin: origemDoPedido }, body: JSON.stringify({ nome, senha }),
  }));
  const valida = await enviar(' DONO.Piloto ', senhaLocal);
  assert.equal(valida.status, 200);
  assert.deepEqual(await valida.json(), { access_token: 'token-teste', refresh_token: 'renovacao-teste' });
  assert.equal(valida.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(requisicoes.map(({ apikey }) => apikey), ['sb_secret_teste', 'sb_publishable_teste']);
  assert.deepEqual(requisicoes[0].dados, { p_nome_usuario: 'dono.piloto' });
  const senhaIncorreta = await enviar('dono.piloto', 'errada');
  const nomeNaoCadastrado = await enviar('nao.cadastrado', 'errada');
  assert.equal(senhaIncorreta.status, 401);
  assert.equal(nomeNaoCadastrado.status, 401);
  assert.deepEqual(await senhaIncorreta.json(), await nomeNaoCadastrado.json());
  assert.equal((await enviar('dono.piloto', senhaLocal, 'https://nao-autorizado.test')).status, 403);
});

test('o banco local da primeira versão é atualizado sem perder os lotes existentes', async (t) => {
  const antigo = await PGlite.create();
  t.after(() => antigo.close());
  // Reproduz o banco da primeira versão, que ainda não registrava as migrações aplicadas.
  await antigo.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
  `);
  const arquivo = new URL('../supabase/migrations/20261124000100_estoque_inicial.sql', import.meta.url);
  await antigo.exec(await readFile(arquivo, 'utf8'));
  const dono = contas.get('dono@piloto.test').id;
  await antigo.query('insert into auth.users values ($1)', [dono]);
  await antigo.query("insert into public.restaurantes values ($1, 'Piloto', 'America/Sao_Paulo')", [restaurantePiloto]);
  const id = randomUUID();
  await antigo.query(`
    insert into public.lotes (id, restaurante_id, insumo, validade_original, medida, quantidade_inicial, cadastrado_por, operacao_id)
    values ($1, $2, 'Farinha', '2030-08-31', 'kg', 3, $3, $4)
  `, [id, restaurantePiloto, dono, randomUUID()]);
  await antigo.query('insert into public.partes_lote (lote_id, saldo) values ($1, 3)', [id]);

  const atualizado = await abrirBancoLocal({ loadDataDir: await antigo.dumpDataDir() });
  t.after(() => atualizado.close());
  const estoque = () => comoUsuario(atualizado, dono, (tx) => listarEstoque(tx, restaurantePiloto));
  const [original] = await estoque();
  assert.equal(original.lote_id, id);
  assert.equal(original.revisao_validade, 0);
  assert.equal(original.validade_aplicavel, '2030-08-31');
  await comoUsuario(atualizado, dono, (tx) => corrigirValidade(tx, {
    p_restaurante_id: restaurantePiloto, p_lote_id: id, p_validade: '2030-09-01', p_revisao: 0,
  }));
  assert.deepEqual(await estoque(), [{
    ...original, validade_aplicavel: '2030-09-01', validade_embalagem: '2030-09-01', revisao_validade: 1,
  }]);
});

test('abertura mantém o saldo total, o código do lote e a menor das duas validades', async () => {
  const dono = contas.get('dono@piloto.test').id;
  const cozinha = contas.get('cozinha@piloto.test').id;
  const outro = contas.get('dono@outro.test').id;
  // Usa o mesmo dia civil do restaurante para o cenário continuar válido com o passar do tempo.
  const { rows: [datas] } = await banco.query(`
    with dia as (select (now() at time zone 'America/Sao_Paulo')::date as hoje)
    select hoje::text, (hoje + 3)::text as curta, (hoje + 10)::text as embalagem,
      (hoje + 15)::text as longa, (hoje - 1)::text as ontem, (hoje + 1)::text as amanha from dia
  `);
  const id = await comoUsuario(banco, dono, (tx) => cadastrarLote(tx, lote({
    p_insumo: 'Caixas de creme de leite', p_validade: datas.embalagem, p_medida: 'un', p_quantidade: '10',
  })));
  const conferir = async () => (await comoUsuario(banco, dono, (tx) => listarEstoque(tx, restaurantePiloto)))
    .filter((parte) => parte.lote_id === id);
  const [fechado] = await conferir();
  const abertura = {
    p_restaurante_id: restaurantePiloto, p_lote_id: id, p_parte_id: fechado.parte_id, p_quantidade: '1',
    p_data_abertura: datas.hoje, p_validade_abertura: datas.curta, p_operacao_id: randomUUID(),
  };
  const registrar = (dados, usuario = cozinha) => comoUsuario(banco, usuario, (tx) => registrarAbertura(tx, dados));
  await assert.rejects(registrar(abertura, outro), { code: '42501' });
  await assert.rejects(registrar({ ...abertura, p_quantidade: '0.5' }), { code: '23514' });
  await assert.rejects(registrar({ ...abertura, p_data_abertura: datas.amanha }), { code: '23514' });
  await assert.rejects(registrar({ ...abertura, p_validade_abertura: datas.ontem }), { code: '23514' });
  const aberta = await registrar(abertura);
  assert.equal(await registrar(abertura), aberta);
  await assert.rejects(registrar({ ...abertura, p_quantidade: '2' }), { code: 'PT409' });
  await assert.rejects(registrar({ ...abertura, p_quantidade: '10', p_operacao_id: randomUUID() }), { code: 'PT409' });
  await assert.rejects(registrar({ ...abertura, p_parte_id: aberta, p_operacao_id: randomUUID() }), { code: 'PT404' });
  assert.deepEqual(await conferir(), [{
    ...fechado, parte_id: aberta, saldo: '1', data_abertura: datas.hoje,
    validade_abertura: datas.curta, validade_aplicavel: datas.curta, situacao: 'breve',
  }, { ...fechado, saldo: '9' }]);

  // Abrir todo o restante remove a linha fechada. A validade da embalagem ainda limita a parte aberta.
  const restante = { ...abertura, p_quantidade: '9', p_validade_abertura: datas.longa, p_operacao_id: randomUUID() };
  const segundaParte = await registrar(restante, dono);
  assert.equal(await registrar(restante, dono), segundaParte);
  const partes = await conferir();
  assert.deepEqual(partes.map(({ saldo, validade_aplicavel }) => [saldo, validade_aplicavel]), [
    ['1', datas.curta], ['9', datas.embalagem],
  ]);
  assert.equal(partes[1].validade_abertura, datas.longa);

  // A regra também vale para chamadas que não passam pelo botão da tela.
  const vencido = await comoUsuario(banco, dono, (tx) => cadastrarLote(tx, lote({ p_validade: datas.ontem })));
  const estoque = await comoUsuario(banco, dono, (tx) => listarEstoque(tx, restaurantePiloto));
  const parteVencida = estoque.find((parte) => parte.lote_id === vencido);
  assert.equal(parteVencida.situacao, 'vencido');
  await assert.rejects(registrar({
    ...abertura, p_lote_id: vencido, p_parte_id: parteVencida.parte_id, p_operacao_id: randomUUID(),
  }), { code: 'PT409' });
});
