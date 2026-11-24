-- Estrutura inicial do piloto, com acesso por restaurante e cadastro atômico de lotes.
begin;

create table public.restaurantes (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  fuso_horario text not null
);

create table public.membros_restaurante (
  restaurante_id uuid not null references public.restaurantes(id),
  usuario_id uuid not null references auth.users(id),
  papel text not null check (papel in ('dono', 'cozinheiro')),
  ativo boolean not null default true,
  primary key (usuario_id, restaurante_id)
);

create table public.lotes (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id),
  insumo text not null check (length(btrim(insumo)) between 1 and 120),
  codigo_fabricante text check (length(codigo_fabricante) <= 80),
  validade_original date not null check (isfinite(validade_original)),
  medida text not null check (medida in ('un', 'kg', 'L')),
  quantidade_inicial numeric not null check (
    quantidade_inicial > 0 and quantidade_inicial < 'Infinity'::numeric
    and (medida <> 'un' or trunc(quantidade_inicial) = quantidade_inicial)
  ),
  cadastrado_por uuid not null references auth.users(id),
  operacao_id uuid not null,
  unique (restaurante_id, cadastrado_por, operacao_id)
);

-- O lote de origem preserva os dados da embalagem. Cada parte guarda seu próprio saldo.
create table public.partes_lote (
  id uuid primary key default gen_random_uuid(),
  lote_id uuid not null references public.lotes(id),
  saldo numeric not null check (saldo >= 0 and saldo < 'Infinity'::numeric)
);

create index partes_lote_lote_id_idx on public.partes_lote(lote_id);

alter table public.restaurantes enable row level security;
alter table public.membros_restaurante enable row level security;
alter table public.lotes enable row level security;
alter table public.partes_lote enable row level security;

-- As políticas partem do vínculo ativo da pessoa autenticada com o restaurante.
create policy consultar_vinculo_ativo on public.membros_restaurante
  for select to authenticated using (usuario_id = (select auth.uid()) and ativo);

create policy consultar_restaurante_vinculado on public.restaurantes
  for select to authenticated using (
    exists (select 1 from public.membros_restaurante as membro where membro.restaurante_id = restaurantes.id)
  );

create policy consultar_lote_do_restaurante on public.lotes
  for select to authenticated using (
    exists (select 1 from public.membros_restaurante as membro where membro.restaurante_id = lotes.restaurante_id)
  );

create policy consultar_parte_de_lote_visivel on public.partes_lote
  for select to authenticated using (
    exists (select 1 from public.lotes as lote where lote.id = partes_lote.lote_id)
  );

-- A consulta usa as mesmas regras de acesso das tabelas que a pessoa pode ler.
create view public.estoque with (security_invoker = true) as
  select l.id as lote_id, p.id as parte_id, l.restaurante_id, l.insumo, l.codigo_fabricante,
    l.validade_original as validade_aplicavel, l.medida, p.saldo::text as saldo,
    -- A situação depende da data local do restaurante.
    case
      when l.validade_original < (now() at time zone r.fuso_horario)::date then 'vencido'
      when l.validade_original = (now() at time zone r.fuso_horario)::date then 'hoje'
      else 'em_dia'
    end as situacao
  from public.partes_lote as p
  join public.lotes as l on l.id = p.lote_id
  join public.restaurantes as r on r.id = l.restaurante_id
  where p.saldo > 0;

revoke all on public.restaurantes, public.membros_restaurante, public.lotes,
  public.partes_lote, public.estoque from public, anon, authenticated;
grant select on public.restaurantes, public.membros_restaurante, public.lotes,
  public.partes_lote, public.estoque to authenticated;

-- O cadastro é a única escrita exposta. As duas inserções pertencem à mesma transação.
create function public.cadastrar_lote(
  p_restaurante_id uuid, p_insumo text, p_codigo_fabricante text, p_validade date,
  p_medida text, p_quantidade numeric, p_operacao_id uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_insumo text := btrim(p_insumo);
  v_codigo text := nullif(btrim(p_codigo_fabricante), '');
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
    quantidade_inicial, cadastrado_por, operacao_id
  ) values (p_restaurante_id, v_insumo, v_codigo, p_validade, p_medida, p_quantidade, v_usuario, p_operacao_id)
  on conflict (restaurante_id, cadastrado_por, operacao_id) do nothing
  returning lote.* into v_lote;

  if found then
    insert into public.partes_lote (lote_id, saldo) values (v_lote.id, p_quantidade);
  else
    -- Um reenvio só devolve o lote existente quando repete os mesmos dados.
    select * into strict v_lote from public.lotes
      where restaurante_id = p_restaurante_id and cadastrado_por = v_usuario and operacao_id = p_operacao_id;
    if row(v_lote.insumo, v_lote.codigo_fabricante, v_lote.validade_original, v_lote.medida, v_lote.quantidade_inicial)
      is distinct from row(v_insumo, v_codigo, p_validade, p_medida, p_quantidade) then
      raise exception 'Este identificador já foi usado em outro cadastro.' using errcode = '23505';
    end if;
  end if;

  return v_lote.id;
end;
$$;

revoke all on function public.cadastrar_lote(uuid, text, text, date, text, numeric, uuid)
  from public, anon, authenticated;
grant execute on function public.cadastrar_lote(uuid, text, text, date, text, numeric, uuid) to authenticated;

commit;
