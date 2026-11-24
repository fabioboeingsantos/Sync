-- Mantém o saldo fechado e registra cada abertura ou fracionamento em uma parte própria.
begin;

alter table public.partes_lote
  add column parte_origem_id uuid references public.partes_lote(id),
  add column data_abertura date,
  add column validade_abertura date,
  add column quantidade_aberta numeric,
  add column operacao_abertura uuid,
  add unique (lote_id, operacao_abertura),
  add constraint dados_da_abertura check (
    (parte_origem_id is null and data_abertura is null and validade_abertura is null
      and quantidade_aberta is null and operacao_abertura is null)
    or (parte_origem_id is not null and data_abertura is not null and validade_abertura is not null
      and quantidade_aberta is not null and operacao_abertura is not null
      and isfinite(data_abertura) and isfinite(validade_abertura) and validade_abertura >= data_abertura
      and quantidade_aberta > 0 and quantidade_aberta < 'Infinity'::numeric)
  );

-- Para a parte aberta, a menor validade determina a posição e a situação no estoque.
create or replace view public.estoque with (security_invoker = true) as
  select l.id as lote_id, p.id as parte_id, l.restaurante_id, l.insumo, l.codigo_fabricante,
    v.validade_aplicavel, l.medida, p.saldo::text as saldo,
    case
      when v.validade_aplicavel < (now() at time zone r.fuso_horario)::date then 'vencido'
      when v.validade_aplicavel = (now() at time zone r.fuso_horario)::date then 'hoje'
      else 'em_dia'
    end as situacao,
    l.revisao_validade, p.data_abertura, p.validade_abertura,
    coalesce(l.validade_corrigida, l.validade_original) as validade_embalagem
  from public.partes_lote as p
  join public.lotes as l on l.id = p.lote_id
  join public.restaurantes as r on r.id = l.restaurante_id
  cross join lateral (
    select least(coalesce(l.validade_corrigida, l.validade_original), p.validade_abertura) as validade_aplicavel
  ) as v
  where p.saldo > 0;

create function public.registrar_abertura(
  p_restaurante_id uuid, p_lote_id uuid, p_parte_id uuid, p_quantidade numeric,
  p_data_abertura date, p_validade_abertura date, p_operacao_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_lote public.lotes%rowtype;
  v_origem public.partes_lote%rowtype;
  v_aberta public.partes_lote%rowtype;
  v_hoje date;
begin
  perform 1 from public.membros_restaurante
    where usuario_id = auth.uid() and restaurante_id = p_restaurante_id and ativo
    for share;
  if not found then
    raise exception 'Sem acesso ao estoque deste restaurante.' using errcode = '42501';
  end if;

  -- Mantém a validade e o saldo do lote estáveis durante a movimentação.
  select * into v_lote from public.lotes
    where id = p_lote_id and restaurante_id = p_restaurante_id
    for share;
  if not found then
    raise exception 'Lote não encontrado.' using errcode = 'PT404';
  end if;

  select * into v_origem from public.partes_lote
    where id = p_parte_id and lote_id = v_lote.id and data_abertura is null
    for update;
  if not found then
    raise exception 'Parte fechada não encontrada.' using errcode = 'PT404';
  end if;

  -- Confere o reenvio antes do saldo, pois a primeira operação pode ter aberto todo o restante.
  select * into v_aberta from public.partes_lote where lote_id = v_lote.id and operacao_abertura = p_operacao_id;
  if found then
    if row(v_aberta.parte_origem_id, v_aberta.quantidade_aberta, v_aberta.data_abertura, v_aberta.validade_abertura)
      is distinct from row(p_parte_id, p_quantidade, p_data_abertura, p_validade_abertura) then
      raise exception 'A operação já foi registrada com outros dados.' using errcode = 'PT409';
    end if;
    return v_aberta.id;
  end if;

  select (now() at time zone fuso_horario)::date into v_hoje
    from public.restaurantes where id = p_restaurante_id;

  if p_operacao_id is null or p_quantidade is null or p_quantidade <= 0 or p_quantidade >= 'Infinity'::numeric
    or (v_lote.medida = 'un' and trunc(p_quantidade) <> p_quantidade)
    or p_data_abertura is null or not isfinite(p_data_abertura) or p_data_abertura > v_hoje
    or p_validade_abertura is null or not isfinite(p_validade_abertura) or p_validade_abertura < p_data_abertura then
    raise exception 'Confira a quantidade e as datas da abertura.' using errcode = '23514';
  end if;

  if coalesce(v_lote.validade_corrigida, v_lote.validade_original) < v_hoje then
    raise exception 'O lote fechado está vencido.' using errcode = 'PT409';
  end if;

  if p_quantidade > v_origem.saldo then
    raise exception 'A quantidade informada excede o saldo fechado.' using errcode = 'PT409';
  end if;

  -- A parte aberta e a redução da parte fechada são gravadas juntas, conservando a quantidade total.
  insert into public.partes_lote (lote_id, saldo, parte_origem_id, data_abertura, validade_abertura, quantidade_aberta, operacao_abertura)
    values (v_lote.id, p_quantidade, v_origem.id, p_data_abertura, p_validade_abertura, p_quantidade, p_operacao_id)
    returning * into v_aberta;
  update public.partes_lote set saldo = saldo - p_quantidade where id = v_origem.id;

  return v_aberta.id;
end;
$$;

revoke all on function public.registrar_abertura(uuid, uuid, uuid, numeric, date, date, uuid) from public, anon, authenticated;
grant execute on function public.registrar_abertura(uuid, uuid, uuid, numeric, date, date, uuid) to authenticated;

commit;
