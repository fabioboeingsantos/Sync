import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { abrirBancoLocal, autenticarContaLocal, contas, senhaLocal } from '../scripts/banco-local.mjs';
import { criarServidorLocal } from '../scripts/dev.mjs';
import {
  algoritmoPadraoSenha, gerarHashSenha, PARAMETROS_ARGON2ID, precisaAtualizarHash, verificarSenha,
} from '../scripts/senhas.mjs';

test('gerarHashSenha usa KDF seguro com sal único e verificarSenha valida em tempo constante', async () => {
  const senha = 'cozinha-segura-visionchef-2026!';
  const primeiro = await gerarHashSenha(senha);
  const segundo = await gerarHashSenha(senha);
  const algoritmo = algoritmoPadraoSenha();

  // Cada derivação gera sal próprio, impedindo hashes idênticos para senhas iguais.
  assert.notEqual(primeiro, segundo);
  assert.ok(primeiro.startsWith(`$${algoritmo}$`), `Esperado prefixo $${algoritmo}$`);
  assert.equal(primeiro.includes(senha), false);

  assert.equal(await verificarSenha(primeiro, senha), true);
  assert.equal(await verificarSenha(primeiro, 'senha-errada-12345'), false);
  assert.equal(await verificarSenha('hash-corrompido', senha), false);
  assert.equal(await verificarSenha(null, senha), false);
  assert.equal(precisaAtualizarHash(primeiro), false);

  // Rejeita senhas vazias ou excessivamente longas para evitar abuso de CPU/memória.
  await assert.rejects(() => gerarHashSenha(''), RangeError);
  await assert.rejects(() => gerarHashSenha('a'.repeat(300)), RangeError);
});

test('migração transparente (lazy rehash) atualiza automaticamente hash antigo no login', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());
  const donoId = contas.get('dono@piloto.test').id;

  // Simula um hash gerado com parâmetro de memória abaixo do piso OWASP atual.
  const hashAntigo = algoritmoPadraoSenha() === 'argon2id'
    ? await gerarHashSenha(senhaLocal, { memory: 4096, passes: 1, parallelism: 1, tagLength: 32 })
    : '$scrypt$n=16384,r=8,p=1$aaaaaaaaaaaaaaaaaaaaaa$bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  if (algoritmoPadraoSenha() === 'argon2id') {
    assert.equal(precisaAtualizarHash(hashAntigo, PARAMETROS_ARGON2ID), true);
    await banco.query('update visionchef_local.credenciais set senha_hash = $2 where usuario_id = $1', [donoId, hashAntigo]);

    const autenticado = await autenticarContaLocal(banco, 'dono@piloto.test', senhaLocal);
    assert.equal(autenticado?.id, donoId);

    // Após o login, o hash armazenado deve ter sido atualizado para os parâmetros atuais.
    const { rows: [{ senha_hash: hashAtualizado }] } = await banco.query(
      'select senha_hash from visionchef_local.credenciais where usuario_id = $1',
      [donoId],
    );
    assert.notEqual(hashAtualizado, hashAntigo);
    assert.equal(precisaAtualizarHash(hashAtualizado), false);
    assert.equal(await verificarSenha(hashAtualizado, senhaLocal), true);
  }
});

test('cadastro, login e redefinição de senha no servidor local gravam apenas hash e revogam sessões antigas', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());
  const pasta = await mkdtemp(join(tmpdir(), 'visionchef-senhas-'));
  t.after(() => rm(pasta, { recursive: true, force: true }));

  const servidor = criarServidorLocal(banco, pasta);
  t.after(() => new Promise((resolve) => servidor.close(resolve)));
  servidor.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  const origem = `http://127.0.0.1:${servidor.address().port}`;

  const post = (rota, corpo, cookie) => fetch(`${origem}/demo/${rota}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origem,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(corpo),
  });

  const senhaInicial = 'estoque-protegido-15-chars!';
  const senhaNova = 'nova-senha-muito-segura-2026!';

  // 1. Cadastro grava somente hash no banco privado (nunca texto puro).
  const cadastro = await post('cadastrar', {
    nomeUsuario: 'chef.seguro',
    email: 'chef.seguro@piloto.test',
    senha: senhaInicial,
  });
  assert.equal(cadastro.status, 201);
  const textoCadastro = await cadastro.text();
  assert.equal(textoCadastro.includes(senhaInicial), false);

  const { rows: [credencialAntes] } = await banco.query(`
    select c.usuario_id, c.senha_hash
    from visionchef_local.credenciais c
    join auth.users u on u.id = c.usuario_id
    where u.email = 'chef.seguro@piloto.test'
  `);
  assert.ok(credencialAntes.senha_hash.startsWith(`$${algoritmoPadraoSenha()}$`));
  assert.equal(credencialAntes.senha_hash.includes(senhaInicial), false);

  // 2. Login abre duas sessões distintas (simulando dois dispositivos) e recusa senha incorreta.
  assert.equal((await post('entrar', { identificador: 'chef.seguro', senha: 'senha-incorreta-999' })).status, 401);
  const loginA = await post('entrar', { identificador: 'chef.seguro', senha: senhaInicial });
  const loginB = await post('entrar', { identificador: 'chef.seguro@piloto.test', senha: senhaInicial });
  assert.equal(loginA.status, 200);
  assert.equal(loginB.status, 200);
  const cookieA = loginA.headers.get('set-cookie').split(';')[0];
  const cookieB = loginB.headers.get('set-cookie').split(';')[0];

  // 3. Redefinição gera novo hash e revoga todas as sessões ativas (incluindo o segundo dispositivo).
  const redefinicao = await post('redefinir-senha', { senhaAtual: senhaInicial, novaSenha: senhaNova }, cookieA);
  assert.equal(redefinicao.status, 200);

  const { rows: [credencialDepois] } = await banco.query(
    'select senha_hash from visionchef_local.credenciais where usuario_id = $1',
    [credencialAntes.usuario_id],
  );
  assert.notEqual(credencialDepois.senha_hash, credencialAntes.senha_hash);

  // Sessão do segundo dispositivo deve estar revogada e senha antiga recusada.
  const sessaoRevogada = await fetch(`${origem}/demo/restaurantes`, { headers: { Cookie: cookieB } });
  assert.equal(sessaoRevogada.status, 401);
  assert.equal((await post('entrar', { identificador: 'chef.seguro', senha: senhaInicial })).status, 401);
  assert.equal((await post('entrar', { identificador: 'chef.seguro', senha: senhaNova })).status, 200);
});
