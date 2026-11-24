import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// O restaurante adicional permite verificar que o estoque fica isolado por vínculo da equipe.
export const restaurantePiloto = '10000000-0000-4000-8000-000000000001';
export const outroRestaurante = '10000000-0000-4000-8000-000000000002';
export const senhaLocal = 'senha123';
export const contas = new Map([
  ['dono@piloto.test', { id: '20000000-0000-4000-8000-000000000001', nome: 'dono.piloto', restaurante: restaurantePiloto, papel: 'dono' }],
  ['funcionario@piloto.test', { id: '20000000-0000-4000-8000-000000000002', nome: 'funcionario.piloto', restaurante: restaurantePiloto, papel: 'funcionario' }],
  ['dono@outro.test', { id: '20000000-0000-4000-8000-000000000003', nome: 'dono.outro', restaurante: outroRestaurante, papel: 'dono' }],
]);

const pastaMigracoes = new URL('../supabase/migrations/', import.meta.url);
const migracaoInicial = '20261124000100_estoque_inicial.sql';

async function aplicarMigracoes(banco) {
  const arquivos = (await readdir(pastaMigracoes)).filter((nome) => nome.endsWith('.sql')).sort();
  await banco.transaction(async (tx) => {
    await tx.exec(`
      create schema if not exists visionchef_local;
      create table if not exists visionchef_local.migracoes (arquivo text primary key);
    `);
    const { rows } = await tx.query('select arquivo from visionchef_local.migracoes');
    const aplicadas = new Set(rows.map(({ arquivo }) => arquivo));

    if (!aplicadas.has(migracaoInicial)) {
      // A primeira versão aplicava a migração inicial sem gravar seu nome. Mantém os dados desse banco.
      const { rows: [estado] } = await tx.query("select to_regclass('public.estoque') is not null as criada");
      if (estado.criada) {
        await tx.query('insert into visionchef_local.migracoes values ($1)', [migracaoInicial]);
        aplicadas.add(migracaoInicial);
      }
    }

    for (const arquivo of arquivos) {
      if (aplicadas.has(arquivo)) continue;
      const sql = await readFile(new URL(arquivo, pastaMigracoes), 'utf8');
      // A transação local agrupa o SQL com seu registro, substituindo o BEGIN e o COMMIT externos do arquivo.
      await tx.exec(sql.replace(/^begin;\r?$/mi, '').replace(/^commit;\s*$/mi, ''));
      await tx.query('insert into visionchef_local.migracoes values ($1)', [arquivo]);
    }
  });
}

export async function abrirBancoLocal(diretorio) {
  const banco = await PGlite.create(diretorio);
  try {
    // Em teste, simulamos somente a identidade que o Supabase fornece ao PostgreSQL.
    await banco.exec(`
      do $$ begin create role anon; exception when duplicate_object then null; end $$;
      do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
      do $$ begin create role service_role; exception when duplicate_object then null; end $$;
      create schema if not exists auth;
      create table if not exists auth.users(id uuid primary key);
      alter table auth.users add column if not exists email text;
      -- O banco local espelha os metadados que o Auth real usa no trigger de nome único.
      alter table auth.users add column if not exists raw_user_meta_data jsonb default '{}'::jsonb;
      create or replace function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
      grant usage on schema auth to authenticated;
    `);
    await aplicarMigracoes(banco);

    // Prepara os dados fictícios preservando os registros já existentes ao reiniciar o servidor.
    await banco.transaction(async (tx) => {
      await tx.query(`
        insert into public.restaurantes (id, nome, fuso_horario)
        values ($1, 'Restaurante piloto', 'America/Sao_Paulo'), ($2, 'Outro restaurante', 'America/Sao_Paulo')
        on conflict (id) do nothing
      `, [restaurantePiloto, outroRestaurante]);
      for (const [email, { id, nome, restaurante, papel }] of contas) {
        // Completa o e-mail nas contas fictícias de bancos que já existiam antes do login por nome.
        await tx.query(`
          insert into auth.users (id, email) values ($1, $2)
          on conflict (id) do update set email = excluded.email where auth.users.email is null
        `, [id, email]);
        await tx.query(`
          insert into public.nomes_usuario (usuario_id, nome_usuario)
          values ($1, $2) on conflict (usuario_id) do nothing
        `, [id, nome]);
        await tx.query(`
          insert into public.membros_restaurante (usuario_id, restaurante_id, papel)
          values ($1, $2, $3) on conflict do nothing
        `, [id, restaurante, papel]);
      }
    });
    return banco;
  } catch (erro) {
    await banco.close();
    throw erro;
  }
}

export async function encontrarContaLocal(banco, identificador) {
  const nome = identificador.trim().toLowerCase();
  if (nome.includes('@')) return contas.get(nome);
  // O servidor local também resolve o nome pela função privada do banco.
  const { rows: [{ email }] } = await banco.query('select public.email_para_nome_usuario($1) as email', [nome]);
  return contas.get(email);
}

// As consultas locais executam como authenticated, sem os privilégios do inicializador.
export function comoUsuario(banco, usuario, executar) {
  return banco.transaction(async (tx) => {
    await tx.exec('set local role authenticated');
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [usuario]);
    return executar(tx);
  });
}

export async function listarRestaurantes(tx) {
  const { rows } = await tx.query('select id, nome from public.restaurantes order by nome, id');
  return rows;
}

export async function listarEstoque(tx, restaurante) {
  // A data como texto mantém o formato de calendário que a API do Supabase envia ao navegador.
  const { rows } = await tx.query(`
    select e.lote_id, e.parte_id, e.insumo, e.codigo_fabricante,
      e.validade_aplicavel::text as validade_aplicavel, e.medida, e.saldo, e.situacao, e.revisao_validade,
      e.data_abertura::text as data_abertura, e.validade_abertura::text as validade_abertura,
      e.validade_embalagem::text as validade_embalagem, e.local_armazenamento
    from public.estoque as e where e.restaurante_id = $1
    order by e.validade_aplicavel, e.insumo, e.parte_id
  `, [restaurante]);
  return rows;
}

export async function cadastrarLote(tx, lote) {
  const { rows: [registro] } = await tx.query(`
    select public.cadastrar_lote($1, $2, $3, $4, $5, $6, $7, $8) as id
  `, [lote.p_restaurante_id, lote.p_insumo, lote.p_codigo_fabricante, lote.p_validade,
    lote.p_medida, lote.p_quantidade, lote.p_operacao_id, lote.p_local ?? null]);
  return registro.id;
}

// Chama no ambiente de teste a mesma função transacional usada pela API do Supabase.
export async function corrigirValidade(tx, correcao) {
  const { rows: [registro] } = await tx.query('select public.corrigir_validade($1, $2, $3, $4) as id', [
    correcao.p_restaurante_id, correcao.p_lote_id, correcao.p_validade, correcao.p_revisao,
  ]);
  return registro.id;
}

// Testes locais passam pela mesma abertura transacional que a versão integrada usa.
export async function registrarAbertura(tx, abertura) {
  const { rows: [registro] } = await tx.query('select public.registrar_abertura($1, $2, $3, $4, $5, $6, $7) as id', [
    abertura.p_restaurante_id, abertura.p_lote_id, abertura.p_parte_id, abertura.p_quantidade,
    abertura.p_data_abertura, abertura.p_validade_abertura, abertura.p_operacao_id,
  ]);
  return registro.id;
}

// O piloto chama a mesma transação de baixa da versão hospedada.
export async function registrarSaida(tx, s) {
  const { rows: [registro] } = await tx.query('select public.registrar_saida($1, $2, $3, $4, $5, $6, $7) as id', [
    s.p_restaurante_id, s.p_lote_id, s.p_parte_id, s.p_tipo, s.p_quantidade, s.p_motivo, s.p_operacao_id,
  ]);
  return registro.id;
}

export async function listarDescartes(tx, restaurante) {
  // Um histórico vazio é diferente de uma conta sem acesso à visão do dono.
  const { rows: [membro] } = await tx.query('select papel from public.membros_restaurante where restaurante_id = $1', [restaurante]);
  if (membro?.papel !== 'dono') return null;
  const { rows } = await tx.query(
    "select insumo, codigo_fabricante, medida, quantidade::text, motivo, registrado_em from public.saidas_estoque where restaurante_id = $1 and tipo = 'descarte' order by registrado_em desc, id desc limit 50",
    [restaurante],
  );
  return rows;
}

