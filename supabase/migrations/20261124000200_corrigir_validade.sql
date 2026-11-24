-- Acrescenta a correção de validade aos lotes já cadastrados.
begin;

alter table public.lotes
  add column validade_corrigida date check (isfinite(validade_corrigida)),
  add column revisao_validade integer not null default 0;

-- Preserva a data informada no cadastro, inclusive para reconhecer um reenvio daquele cadastro.
create or replace view public.estoque with (security_invoker = true) as
  select l.id as lote_id, p.id as parte_id, l.restaurante_id, l.insumo, l.codigo_fabricante,
    v.validade_aplicavel, l.medida, p.saldo::text as saldo,
    case
      when v.validade_aplicavel < (now() at time zone r.fuso_horario)::date then 'vencido'
      when v.validade_aplicavel = (now() at time zone r.fuso_horario)::date then 'hoje'
      else 'em_dia'
    end as situacao,
    l.revisao_validade
  from public.partes_lote as p
  join public.lotes as l on l.id = p.lote_id
  join public.restaurantes as r on r.id = l.restaurante_id
  cross join lateral (select coalesce(l.validade_corrigida, l.validade_original) as validade_aplicavel) as v
  where p.saldo > 0;

create function public.corrigir_validade(
  p_restaurante_id uuid, p_lote_id uuid, p_validade date, p_revisao integer
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_lote public.lotes%rowtype;
  v_validade_atual date;
begin
  -- Confere o vínculo antes de procurar o lote, inclusive para contas já revogadas.
  perform 1 from public.membros_restaurante
    where usuario_id = auth.uid() and restaurante_id = p_restaurante_id and ativo
    for share;
  if not found then
    raise exception 'Sem acesso ao estoque deste restaurante.' using errcode = '42501';
  end if;

  if p_validade is null or not isfinite(p_validade) or p_revisao is null or p_revisao < 0 then
    raise exception 'Confira a nova validade.' using errcode = '23514';
  end if;

  -- O bloqueio da linha impede que duas edições validem a mesma revisão ao mesmo tempo.
  select * into v_lote from public.lotes
    where id = p_lote_id and restaurante_id = p_restaurante_id
    for update;
  if not found then
    raise exception 'Lote não encontrado.' using errcode = 'PT404';
  end if;

  v_validade_atual := coalesce(v_lote.validade_corrigida, v_lote.validade_original);
  if v_lote.revisao_validade <> p_revisao then
    -- Um reenvio da última alteração com a mesma data já está atendido.
    if v_lote.revisao_validade - 1 = p_revisao and v_validade_atual = p_validade then
      return v_lote.id;
    end if;
    raise exception 'A validade deste lote mudou desde que você abriu a edição.' using errcode = 'PT409';
  end if;

  if v_validade_atual <> p_validade then
    update public.lotes
      set validade_corrigida = p_validade, revisao_validade = revisao_validade + 1
      where id = v_lote.id;
  end if;

  return v_lote.id;
end;
$$;

revoke all on function public.corrigir_validade(uuid, uuid, date, integer) from public, anon, authenticated;
grant execute on function public.corrigir_validade(uuid, uuid, date, integer) to authenticated;

commit;
