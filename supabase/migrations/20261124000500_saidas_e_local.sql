
-- Atualiza o saldo e registra o histórico na mesma transação.
begin;
alter table public.lotes add column local_armazenamento text
  check (char_length(local_armazenamento) between 1 and 120);

create table public.saidas_estoque (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id),
  parte_id uuid not null references public.partes_lote(id),
  autor_id uuid not null references auth.users(id),
  operacao_id uuid not null,
  tipo text not null check (tipo in ('uso', 'descarte')),
  motivo text,
  insumo text not null,
  codigo_fabricante text,
  medida text not null,
  quantidade numeric not null check (quantidade > 0 and quantidade < 'Infinity'::numeric),
  validade_aplicavel date not null,
  registrado_em timestamptz not null default now(),
  unique (restaurante_id, autor_id, operacao_id),
  check ((tipo = 'uso' and motivo is null) or
    (tipo = 'descarte' and motivo is not null and motivo in ('vencimento', 'outro')))
);
create index saidas_descartes_por_restaurante on public.saidas_estoque (restaurante_id, registrado_em desc)
  where tipo = 'descarte';
alter table public.saidas_estoque enable row level security;
revoke all on public.saidas_estoque from public, anon, authenticated;
grant select on public.saidas_estoque to authenticated;
create policy dono_consulta_saidas on public.saidas_estoque for select to authenticated using (
  exists (
    select 1 from public.membros_restaurante m
      where m.restaurante_id = saidas_estoque.restaurante_id and m.usuario_id = (select auth.uid())
        and m.ativo and m.papel = 'dono'
  )
);

create function public.registrar_saida(
  p_restaurante_id uuid, p_lote_id uuid, p_parte_id uuid, p_tipo text,
  p_quantidade numeric, p_motivo text, p_operacao_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_lote public.lotes%rowtype;
  v_parte public.partes_lote%rowtype;
  v_saida public.saidas_estoque%rowtype;
  v_validade date;
  v_hoje date;
begin
  perform 1 from public.membros_restaurante
    where usuario_id = v_usuario and restaurante_id = p_restaurante_id and ativo for share;
  if not found then raise exception 'Sem acesso ao estoque deste restaurante.' using errcode = '42501'; end if;

  -- Os bloqueios manterão validade e saldo estáveis durante a operação.
  select * into v_lote from public.lotes where id = p_lote_id and restaurante_id = p_restaurante_id for share;
  if not found then raise exception 'Lote não encontrado.' using errcode = 'PT404'; end if;
  select * into v_parte from public.partes_lote where id = p_parte_id and lote_id = v_lote.id for update;
  if not found then raise exception 'Parte do lote não encontrada.' using errcode = 'PT404'; end if;

  -- Reenvios do mesmo pedido retornam a baixa original, mesmo com o saldo zerado.
  select * into v_saida from public.saidas_estoque
    where restaurante_id = p_restaurante_id and autor_id = v_usuario and operacao_id = p_operacao_id;
  if found then
    if row(v_saida.parte_id, v_saida.tipo, v_saida.quantidade, v_saida.motivo)
      is distinct from row(p_parte_id, p_tipo, p_quantidade, p_motivo) then
      raise exception 'A operação já foi registrada com outros dados.' using errcode = 'PT409';
    end if;
    return v_saida.id;
  end if;

  if p_operacao_id is null or p_tipo is null or p_tipo not in ('uso', 'descarte')
    or p_quantidade is null or p_quantidade <= 0 or p_quantidade >= 'Infinity'::numeric
    or (v_lote.medida = 'un' and trunc(p_quantidade) <> p_quantidade)
    or (p_tipo = 'uso' and p_motivo is not null)
    or (p_tipo = 'descarte' and (p_motivo is null or p_motivo not in ('vencimento', 'outro'))) then
    raise exception 'Confira o tipo, a quantidade e o motivo.' using errcode = '23514';
  end if;
  if p_quantidade > v_parte.saldo then
    raise exception 'A quantidade excede o saldo disponível.' using errcode = 'PT409';
  end if;
  v_validade := least(coalesce(v_lote.validade_corrigida, v_lote.validade_original), v_parte.validade_abertura);
  select (now() at time zone fuso_horario)::date into v_hoje
    from public.restaurantes where id = p_restaurante_id;
  if p_tipo = 'uso' and v_validade < v_hoje then
    raise exception 'O lote está vencido. Confira a validade ou registre o descarte.' using errcode = 'PT409';
  end if;

  insert into public.saidas_estoque (restaurante_id, parte_id, autor_id, operacao_id, tipo, motivo,
    insumo, codigo_fabricante, medida, quantidade, validade_aplicavel)
  values (p_restaurante_id, p_parte_id, v_usuario, p_operacao_id, p_tipo, p_motivo,
    v_lote.insumo, v_lote.codigo_fabricante, v_lote.medida, p_quantidade, v_validade) returning * into v_saida;
  update public.partes_lote set saldo = saldo - p_quantidade where id = p_parte_id;
  return v_saida.id;
end;
$$;
revoke all on function public.registrar_saida(uuid, uuid, uuid, text, numeric, text, uuid)
  from public, anon, authenticated;
grant execute on function public.registrar_saida(uuid, uuid, uuid, text, numeric, text, uuid) to authenticated;

-- O campo opcional preserva a compatibilidade dos cadastros anteriores.
drop function public.cadastrar_lote(uuid, text, text, date, text, numeric, uuid);
create function public.cadastrar_lote(
  p_restaurante_id uuid, p_insumo text, p_codigo_fabricante text, p_validade date,
  p_medida text, p_quantidade numeric, p_operacao_id uuid, p_local text default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_insumo text := btrim(p_insumo);
  v_codigo text := nullif(btrim(p_codigo_fabricante), '');
  v_local text := nullif(btrim(p_local), '');
  v_lote public.lotes%rowtype;
begin
  -- Confere e bloqueia o vínculo durante o cadastro para manter a permissão até o fim da operação.
  perform 1 from public.membros_restaurante
    where usuario_id = v_usuario and restaurante_id = p_restaurante_id and ativo
    for share;
  if not found then
    raise exception 'Sem acesso ao estoque deste restaurante.' using errcode = '42501';
  end if;

  insert into public.lotes as lote (
    restaurante_id, insumo, codigo_fabricante, validade_original, medida,
    quantidade_inicial, cadastrado_por, operacao_id, local_armazenamento
  ) values (p_restaurante_id, v_insumo, v_codigo, p_validade, p_medida, p_quantidade, v_usuario, p_operacao_id, v_local)
  on conflict (restaurante_id, cadastrado_por, operacao_id) do nothing
  returning lote.* into v_lote;

  if found then
    insert into public.partes_lote (lote_id, saldo) values (v_lote.id, p_quantidade);
  else
    -- Um reenvio só devolve o lote existente quando repete os mesmos dados.
    select * into strict v_lote from public.lotes
      where restaurante_id = p_restaurante_id and cadastrado_por = v_usuario and operacao_id = p_operacao_id;
    if row(v_lote.insumo, v_lote.codigo_fabricante, v_lote.validade_original, v_lote.medida, v_lote.quantidade_inicial, v_lote.local_armazenamento)
      is distinct from row(v_insumo, v_codigo, p_validade, p_medida, p_quantidade, v_local) then
      raise exception 'Este identificador já foi usado em outro cadastro.' using errcode = '23505';
    end if;
  end if;

  return v_lote.id;
end;
$$;

revoke all on function public.cadastrar_lote(uuid, text, text, date, text, numeric, uuid, text)
  from public, anon, authenticated;
grant execute on function public.cadastrar_lote(uuid, text, text, date, text, numeric, uuid, text) to authenticated;

create or replace view public.estoque with (security_invoker = true) as
  select l.id as lote_id, p.id as parte_id, l.restaurante_id, l.insumo, l.codigo_fabricante,
    v.validade_aplicavel, l.medida, p.saldo::text as saldo,
    case
      when v.validade_aplicavel < (now() at time zone r.fuso_horario)::date then 'vencido'
      when v.validade_aplicavel = (now() at time zone r.fuso_horario)::date then 'hoje'
      when v.validade_aplicavel <= (now() at time zone r.fuso_horario)::date + 3 then 'breve'
      else 'em_dia'
    end as situacao,
    l.revisao_validade, p.data_abertura, p.validade_abertura,
    coalesce(l.validade_corrigida, l.validade_original) as validade_embalagem, l.local_armazenamento
  from public.partes_lote as p
  join public.lotes as l on l.id = p.lote_id
  join public.restaurantes as r on r.id = l.restaurante_id
  cross join lateral (
    select least(coalesce(l.validade_corrigida, l.validade_original), p.validade_abertura) as validade_aplicavel
  ) as v
  where p.saldo > 0;

commit;
