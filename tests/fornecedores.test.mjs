import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { abrirBancoLocal, outroRestaurante, restaurantePiloto, senhaLocal } from '../scripts/banco-local.mjs';
import { montarPiloto } from '../scripts/build.mjs';
import { criarServidorLocal } from '../scripts/dev.mjs';

// Valida o módulo de Fornecedores (dono gerencia, funcionário consulta ativos, isolamento e revogação imediata)
// e a presença da barra administrativa (Estoque, Equipe, Fornecedores) + assistente Vision na interface.
test('dono gerencia fornecedores, funcionário consulta somente ativos e isolamento é mantido', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());

  const temporarios = resolve(tmpdir());
  const prefixo = 'visionchef-fornecedores-';
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

  async function entrar(identificador) {
    const resp = await chamada('entrar', { dados: { identificador, senha: senhaLocal } });
    assert.equal(resp.status, 200);
    return resp.headers.get('set-cookie').split(';')[0];
  }

  const cookieDono = await entrar('dono@piloto.test');
  const cookieFuncionario = await entrar('funcionario@piloto.test');
  const cookieOutroDono = await entrar('dono@outro.test');

  // 1. Dono cadastra fornecedor e edita os dados.
  const criadoResp = await chamada('fornecedores/salvar', {
    cookie: cookieDono,
    dados: {
      p_restaurante_id: restaurantePiloto,
      p_nome: 'Laticínios do Vale',
      p_categoria: 'Laticínios',
      p_contato: '(47) 99999-1111',
      p_email: 'pedidos@laticinios.test',
      p_observacoes: 'Entregas às segundas e quintas.',
    },
  });
  assert.equal(criadoResp.status, 200);
  const criado = await criadoResp.json();
  assert.equal(criado.nome, 'Laticínios do Vale');
  assert.equal(criado.ativo, true);

  const editadoResp = await chamada('fornecedores/salvar', {
    cookie: cookieDono,
    dados: {
      p_restaurante_id: restaurantePiloto,
      p_fornecedor_id: criado.id,
      p_nome: 'Laticínios do Vale Ltda',
      p_categoria: 'Laticínios e frios',
      p_contato: '(47) 99999-2222',
    },
  });
  assert.equal(editadoResp.status, 200);
  assert.equal((await editadoResp.json()).nome, 'Laticínios do Vale Ltda');

  // 2. Funcionário consulta ativos, mas é bloqueado em escrita (403).
  const listaFunc = await (await chamada(`fornecedores?restaurante=${restaurantePiloto}`, { cookie: cookieFuncionario })).json();
  assert.equal(listaFunc.length, 1);
  assert.equal(listaFunc[0].nome, 'Laticínios do Vale Ltda');

  assert.equal((await chamada('fornecedores/salvar', {
    cookie: cookieFuncionario,
    dados: { p_restaurante_id: restaurantePiloto, p_nome: 'Não autorizado' },
  })).status, 403);
  assert.equal((await chamada('fornecedores/status', {
    cookie: cookieFuncionario,
    dados: { p_restaurante_id: restaurantePiloto, p_fornecedor_id: criado.id, p_ativo: false },
  })).status, 403);

  // 3. Dono de outro restaurante não acessa nem altera fornecedores do piloto.
  assert.equal((await chamada(`fornecedores?restaurante=${restaurantePiloto}`, { cookie: cookieOutroDono })).status, 403);
  assert.equal((await chamada('fornecedores/salvar', {
    cookie: cookieOutroDono,
    dados: { p_restaurante_id: restaurantePiloto, p_nome: 'Invasor' },
  })).status, 403);
  assert.deepEqual(await (await chamada(`fornecedores?restaurante=${outroRestaurante}`, { cookie: cookieOutroDono })).json(), []);

  // 4. Dono desativa fornecedor: dono continua vendo como inativo; funcionário não vê inativos.
  const desativado = await chamada('fornecedores/status', {
    cookie: cookieDono,
    dados: { p_restaurante_id: restaurantePiloto, p_fornecedor_id: criado.id, p_ativo: false },
  });
  assert.equal(desativado.status, 200);
  assert.deepEqual(await desativado.json(), { ativo: false });

  const listaDono = await (await chamada(`fornecedores?restaurante=${restaurantePiloto}`, { cookie: cookieDono })).json();
  assert.equal(listaDono.length, 1);
  assert.equal(listaDono[0].ativo, false);
  assert.deepEqual(await (await chamada(`fornecedores?restaurante=${restaurantePiloto}`, { cookie: cookieFuncionario })).json(), []);

  // 5. Confere que o Dock organiza os módulos, respeita o perfil e continua integrado ao sino.
  const htmlPiloto = await readFile(new URL('../piloto/index.html', import.meta.url), 'utf8');
  const menuReact = await readFile(new URL('../frontend/menu-estoque.jsx', import.meta.url), 'utf8');
  const dockReact = await readFile(new URL('../frontend/components/Dock.jsx', import.meta.url), 'utf8');
  const sinoReact = await readFile(new URL('../frontend/components/BellToggle.jsx', import.meta.url), 'utf8');
  assert.match(htmlPiloto, /id="dock-nav-root"/);
  assert.match(menuReact, /from '\.\/components\/Dock\.jsx'/);
  assert.match(menuReact, /label: 'Estoque'/);
  assert.match(menuReact, /label: 'Controle de validade'/);
  assert.match(menuReact, /label: 'Relatório de desperdício'/);
  assert.match(menuReact, /label: 'Equipe'/);
  assert.match(menuReact, /label: 'Fornecedores'/);
  assert.match(dockReact, /aria-current=\{item\.active \? 'page' : undefined\}/);
  assert.match(dockReact, /aria-label=\{ariaLabel\}/);
  assert.match(htmlPiloto, /id="sino-notificacoes-root"/);
  assert.match(sinoReact, /aria-expanded={on}/);
  assert.match(sinoReact, /aria-controls={controls}/);
  assert.match(htmlPiloto, /id="abrir-vision"/);
  assert.match(htmlPiloto, /Preencher com Vision/);
});
