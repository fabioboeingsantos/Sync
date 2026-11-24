import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { interpretarLote } from '../piloto/interpretar-lote.js';
import {
  abrirBancoLocal, cadastrarLote, comoUsuario, contas, listarDescartes,
  listarEstoque, registrarSaida, restaurantePiloto,
} from '../scripts/banco-local.mjs';

test('assistente sugere campos e exige data válida quando a descrição é ambígua', () => {
  assert.deepEqual(interpretarLote('Creme de leite, lote A12, 2 caixas, validade 19/11/2026, freezer'), {
    insumo: 'Creme de leite', codigo: 'A12', quantidade: '2', medida: 'un', validade: '2026-11-19', local: 'freezer',
  });
  assert.equal(interpretarLote('Queijo, lote B02, vence na terça').validade, '');
  assert.equal(interpretarLote('Queijo, validade 31/02/2026').validade, '');
  assert.equal(interpretarLote('Queijo, validade 12/01/2026 ou 15/01/2026').validade, '');
  const convertido = interpretarLote('Farinha, 500g, validade 02/12/2026, local: armário seco');
  assert.equal(convertido.quantidade, '0.500');
  assert.equal(convertido.medida, 'kg');
  assert.equal(convertido.local, 'armário seco');
});

test('baixas preservam histórico, respeitam o saldo e bloqueiam uso de vencidos', async (t) => {
  const banco = await abrirBancoLocal();
  t.after(() => banco.close());
  const dono = contas.get('dono@piloto.test').id;
  const cozinheiro = contas.get('cozinha@piloto.test').id;
  const outro = contas.get('dono@outro.test').id;
  const { rows: [datas] } = await banco.query(
    "select (current_date + 7)::text as boa, (current_date - 2)::text as vencida",
  );
  const listar = (id = dono) => comoUsuario(banco, id, (tx) => listarEstoque(tx, restaurantePiloto));
  async function criar(validade) {
    const id = await comoUsuario(banco, dono, (tx) => cadastrarLote(tx, {
      p_restaurante_id: restaurantePiloto, p_insumo: 'Molho de tomate', p_codigo_fabricante: 'A12',
      p_validade: validade, p_medida: 'un', p_quantidade: '10', p_operacao_id: randomUUID(),
      p_local: 'Prateleira de cima',
    }));
    return (await listar()).find((lote) => lote.lote_id === id);
  }
  const ativo = await criar(datas.boa);
  const vencido = await criar(datas.vencida);
  assert.equal(ativo.local_armazenamento, 'Prateleira de cima');
  const saida = (parte, tipo, quantidade, motivo = null) => ({
    p_restaurante_id: restaurantePiloto, p_lote_id: parte.lote_id, p_parte_id: parte.parte_id,
    p_tipo: tipo, p_quantidade: quantidade, p_motivo: motivo, p_operacao_id: randomUUID(),
  });
  const registrar = (dados, id = cozinheiro) => comoUsuario(banco, id, (tx) => registrarSaida(tx, dados));

  // O cozinheiro pode movimentar o próprio estoque. Um reenvio mantém o saldo e o histórico.
  const uso = saida(ativo, 'uso', '3');
  assert.equal(await registrar(uso), await registrar(uso));
  await registrar(saida(ativo, 'descarte', '2', 'outro'));
  await assert.rejects(registrar(saida(ativo, 'uso', '6')), { code: 'PT409' });
  await assert.rejects(registrar(saida(ativo, 'uso', '1'), outro), { code: '42501' });
  assert.equal((await listar()).find((lote) => lote.parte_id === ativo.parte_id).saldo, '5');
  await registrar(saida(ativo, 'uso', '5'));
  assert.equal((await listar()).some((lote) => lote.parte_id === ativo.parte_id), false);

  await assert.rejects(registrar(saida(vencido, 'uso', '1')), { code: 'PT409' });
  await registrar(saida(vencido, 'descarte', '10', 'vencimento'));
  assert.equal((await listar()).length, 0);
  const historico = (id) => comoUsuario(banco, id, (tx) => listarDescartes(tx, restaurantePiloto));
  assert.deepEqual((await historico(dono)).map(({ motivo, quantidade }) => [motivo, quantidade]), [
    ['vencimento', '10'], ['outro', '2'],
  ]);
  assert.equal(await historico(cozinheiro), null);
  assert.equal(await historico(outro), null);
  // A restrição também vale para quem tenta consultar a tabela diretamente.
  assert.deepEqual((await comoUsuario(banco, cozinheiro, (tx) => tx.query('select id from public.saidas_estoque'))).rows, []);
});
