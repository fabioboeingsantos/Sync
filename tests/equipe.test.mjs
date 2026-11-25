import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { abrirBancoLocal, outroRestaurante, restaurantePiloto, senhaLocal } from '../scripts/banco-local.mjs';
import { montarPiloto } from '../scripts/build.mjs';
import { criarServidorLocal } from '../scripts/dev.mjs';

// Exercita REQ-F-004, REQ-F-005 e SEC-06 ponta a ponta no servidor local com RLS e RPCs reais.
test('dono gerencia equipe em /equipe e revogação bloqueia imediatamente uma sessão aberta', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());

  const temporarios = resolve(tmpdir());
  const prefixo = 'visionchef-equipe-';
  const pastaPublica = await mkdtemp(join(temporarios, prefixo));
  t.after(async () => {
    assert.equal(dirname(resolve(pastaPublica)), temporarios);
    assert.ok(basename(pastaPublica).startsWith(prefixo));
    await rm(pastaPublica, { recursive: true, force: true });
  });

  await montarPiloto({ destino: pastaPublica, local: true });
  const servidor = criarServidorLocal(banco, pastaPublica);
  t.after(() => new Promise((resolver) => servidor.close(resolver)));
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const origem = `http://127.0.0.1:${servidor.address().port}`;

  // Confere o redirect /equipe -> /equipe/ e o HTML publicado da tela de gestão.
  const paginaEquipe = await fetch(`${origem}/equipe`);
  assert.equal(paginaEquipe.status, 200);
  assert.equal(paginaEquipe.url, `${origem}/equipe/`);
  const htmlEquipe = await paginaEquipe.text();
  assert.match(htmlEquipe, /id="form-vincular"/);
  assert.match(htmlEquipe, /id="dialogo-remover"/);
  assert.match(htmlEquipe, /class="botao botao-primario"/);

  async function chamada(caminho, { cookie, dados } = {}) {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (dados !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers.Origin = origem;
    }
    return fetch(`${origem}/demo/${caminho}`, {
      method: dados !== undefined ? 'POST' : 'GET',
      headers,
      body: dados !== undefined ? JSON.stringify(dados) : undefined,
    });
  }

  async function entrar(identificador, senha = senhaLocal) {
    const resposta = await chamada('entrar', { dados: { identificador, senha } });
    assert.equal(resposta.status, 200);
    return resposta.headers.get('set-cookie').split(';')[0];
  }

  // 1. Cria uma nova conta sem vínculo algum e mantém a sessão dela aberta.
  const senhaNova = 'cozinha-equipe-2026-teste';
  const cadastro = await chamada('cadastrar', {
    dados: { nomeUsuario: 'nova.cozinha', email: 'nova@piloto.test', senha: senhaNova },
  });
  assert.equal(cadastro.status, 201);

  const cookieNova = await entrar('nova.cozinha', senhaNova);
  assert.deepEqual(await (await chamada('restaurantes', { cookie: cookieNova })).json(), []);
  assert.equal((await chamada('lotes', {
    cookie: cookieNova,
    dados: {
      p_restaurante_id: restaurantePiloto,
      p_insumo: 'Tomate',
      p_codigo_fabricante: null,
      p_validade: '2030-05-01',
      p_medida: 'kg',
      p_quantidade: '2',
      p_operacao_id: randomUUID(),
    },
  })).status, 403);

  // 2. Funcionário e dono de outro restaurante não podem consultar nem alterar a equipe do piloto.
  const cookieDono = await entrar('dono@piloto.test');
  const cookieFuncionario = await entrar('funcionario@piloto.test');
  const cookieOutroDono = await entrar('dono@outro.test');

  assert.equal((await chamada(`equipe?restaurante=${restaurantePiloto}`, { cookie: cookieFuncionario })).status, 403);
  assert.equal((await chamada(`equipe?restaurante=${restaurantePiloto}`, { cookie: cookieOutroDono })).status, 403);
  assert.equal((await chamada('equipe/vincular', {
    cookie: cookieFuncionario,
    dados: { p_restaurante_id: restaurantePiloto, p_identificador: 'nova.cozinha', p_papel: 'funcionario' },
  })).status, 403);
  assert.equal((await chamada('equipe/vincular', {
    cookie: cookieOutroDono,
    dados: { p_restaurante_id: restaurantePiloto, p_identificador: 'nova.cozinha', p_papel: 'funcionario' },
  })).status, 403);

  // 3. Dono vincula a conta nova por nome de usuário e confere rejeição de conta inexistente.
  const inexistente = await chamada('equipe/vincular', {
    cookie: cookieDono,
    dados: { p_restaurante_id: restaurantePiloto, p_identificador: 'nao.existe', p_papel: 'funcionario' },
  });
  assert.equal(inexistente.status, 404);

  const vinculadoResp = await chamada('equipe/vincular', {
    cookie: cookieDono,
    dados: { p_restaurante_id: restaurantePiloto, p_identificador: '  NOVA.Cozinha ', p_papel: 'funcionario' },
  });
  assert.equal(vinculadoResp.status, 200);
  const vinculado = await vinculadoResp.json();
  assert.equal(vinculado.nome_usuario, 'nova.cozinha');
  assert.equal(vinculado.papel, 'funcionario');
  assert.equal(vinculado.ativo, true);

  // 4. Com a sessão já aberta, a nova funcionária passa a ler e cadastrar no estoque.
  const restaurantesLiberados = await (await chamada('restaurantes', { cookie: cookieNova })).json();
  assert.equal(restaurantesLiberados.length, 1);
  assert.equal(restaurantesLiberados[0].id, restaurantePiloto);

  const cadastroLote = await chamada('lotes', {
    cookie: cookieNova,
    dados: {
      p_restaurante_id: restaurantePiloto,
      p_insumo: 'Molho de tomate',
      p_codigo_fabricante: 'EQ01',
      p_validade: '2030-05-10',
      p_medida: 'un',
      p_quantidade: '4',
      p_operacao_id: randomUUID(),
    },
  });
  assert.equal(cadastroLote.status, 200);
  const estoqueVisivel = await (await chamada(`lotes?restaurante=${restaurantePiloto}`, { cookie: cookieNova })).json();
  assert.equal(estoqueVisivel.length, 1);

  // 5. Único dono ativo não pode remover ou rebaixar a si mesmo.
  const listaEquipe = await (await chamada(`equipe?restaurante=${restaurantePiloto}`, { cookie: cookieDono })).json();
  const registroDono = listaEquipe.find((m) => m.papel === 'dono');
  const autoRemocao = await chamada('equipe/remover', {
    cookie: cookieDono,
    dados: { p_restaurante_id: restaurantePiloto, p_usuario_id: registroDono.usuario_id },
  });
  assert.equal(autoRemocao.status, 409);

  // 6. Revogação imediata (SEC-06): dono remove o acesso e a sessão ainda aberta perde leitura e escrita na hora.
  const remocao = await chamada('equipe/remover', {
    cookie: cookieDono,
    dados: { p_restaurante_id: restaurantePiloto, p_usuario_id: vinculado.usuario_id },
  });
  assert.equal(remocao.status, 200);
  assert.deepEqual(await remocao.json(), { removido: true });

  // Mesmo sem sair ou renovar o cookie, a funcionária perde acesso imediato ao restaurante e ao estoque.
  assert.deepEqual(await (await chamada('restaurantes', { cookie: cookieNova })).json(), []);
  assert.deepEqual(await (await chamada(`lotes?restaurante=${restaurantePiloto}`, { cookie: cookieNova })).json(), []);
  assert.equal((await chamada('lotes', {
    cookie: cookieNova,
    dados: {
      p_restaurante_id: restaurantePiloto,
      p_insumo: 'Tentativa revogada',
      p_codigo_fabricante: null,
      p_validade: '2030-06-01',
      p_medida: 'un',
      p_quantidade: '1',
      p_operacao_id: randomUUID(),
    },
  })).status, 403);

  // 7. Reativação por e-mail volta a liberar o estoque, sem conceder acesso ao outro restaurante.
  const reativacao = await chamada('equipe/vincular', {
    cookie: cookieDono,
    dados: { p_restaurante_id: restaurantePiloto, p_identificador: 'NOVA@piloto.test', p_papel: 'funcionario' },
  });
  assert.equal(reativacao.status, 200);
  const aposReativar = await (await chamada('restaurantes', { cookie: cookieNova })).json();
  assert.deepEqual(aposReativar.map((r) => r.id), [restaurantePiloto]);
  assert.deepEqual(await (await chamada(`lotes?restaurante=${outroRestaurante}`, { cookie: cookieNova })).json(), []);
});
