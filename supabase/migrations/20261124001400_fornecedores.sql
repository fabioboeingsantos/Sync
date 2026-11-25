-- Adiciona cadastro e consulta de fornecedores por restaurante com RLS e escrita restrita ao dono ativo.
begin;

create table public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  restaurante_id uuid not null references public.restaurantes(id),
  nome text not null check (length(btrim(nome)) between 1 and 120),
  categoria text check (length(categoria) <= 80),
  contato text check (length(contato) <= 120),
  email text check (length(email) <= 254),
  observacoes text check (length(observacoes) <= 400),
  ativo boolean not null default true,
  criado_por uuid not null references auth.users(id),
  criado_em timestamptz not null default clock_timestamp()
);

create index fornecedores_restaurante_idx
  on public.fornecedores (restaurante_id, ativo desc, nome asc);

alter table public.fornecedores enable row level security;

-- Qualquer membro ativo do restaurante pode consultar fornecedores via RLS; escritas ocorrem somente via RPC.
create policy consultar_fornecedor_do_restaurante on public.fornecedores
  for select to authenticated using (
    exists (
      select 1 from public.membros_restaurante as m
      where m.restaurante_id = fornecedores.restaurante_id
        and m.usuario_id = (select auth.uid())
        and m.ativo = true
    )
  );

revoke all on public.fornecedores from public, anon, authenticated;
grant select on public.fornecedores to authenticated;

-- Lista fornecedores do restaurante: dono visualiza ativos e inativos; funcionário visualiza apenas ativos.
create or replace function public.listar_fornecedores_restaurante(p_restaurante_id uuid)
returns table (
  id uuid,
  nome text,
  categoria text,
  contato text,
  email text,
  observacoes text,
  ativo boolean,
  criado_em timestamptz
)
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
  v_papel text;
begin
  if v_solicitante is null or p_restaurante_id is null then
    raise exception 'Sem acesso aos fornecedores deste restaurante.' using errcode = '42501';
  end if;

  select m.papel into v_papel
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante
    and m.restaurante_id = p_restaurante_id
    and m.ativo = true;

  if not found then
    raise exception 'Sem acesso aos fornecedores deste restaurante.' using errcode = '42501';
  end if;

  return query
  select
    f.id,
    f.nome,
    f.categoria,
    f.contato,
    f.email,
    f.observacoes,
    f.ativo,
    f.criado_em
  from public.fornecedores as f
  where f.restaurante_id = p_restaurante_id
    and (v_papel = 'dono' or f.ativo = true)
  order by f.ativo desc, lower(f.nome) asc, f.id asc;
end;
$$;

-- Cria ou atualiza um fornecedor; operação exclusiva do dono ativo do restaurante.
create or replace function public.salvar_fornecedor_restaurante(
  p_restaurante_id uuid,
  p_fornecedor_id uuid default null,
  p_nome text default null,
  p_categoria text default null,
  p_contato text default null,
  p_email text default null,
  p_observacoes text default null
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
  v_nome text := btrim(coalesce(p_nome, ''));
  v_categoria text := nullif(btrim(coalesce(p_categoria, '')), '');
  v_contato text := nullif(btrim(coalesce(p_contato, '')), '');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_observacoes text := nullif(btrim(coalesce(p_observacoes, '')), '');
  v_registro public.fornecedores%rowtype;
begin
  if v_solicitante is null or p_restaurante_id is null then
    raise exception 'Apenas o dono do restaurante pode gerenciar fornecedores.' using errcode = '42501';
  end if;

  perform 1
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante
    and m.restaurante_id = p_restaurante_id
    and m.papel = 'dono'
    and m.ativo = true
  for share;

  if not found then
    raise exception 'Apenas o dono do restaurante pode gerenciar fornecedores.' using errcode = '42501';
  end if;

  if length(v_nome) < 1 or length(v_nome) > 120 then
    raise exception 'Informe o nome do fornecedor (até 120 caracteres).' using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Informe um e-mail válido para o fornecedor.' using errcode = '22023';
  end if;

  if p_fornecedor_id is null then
    insert into public.fornecedores (
      restaurante_id, nome, categoria, contato, email, observacoes, criado_por
    ) values (
      p_restaurante_id, v_nome, v_categoria, v_contato, v_email, v_observacoes, v_solicitante
    )
    returning * into v_registro;
  else
    update public.fornecedores
    set
      nome = v_nome,
      categoria = v_categoria,
      contato = v_contato,
      email = v_email,
      observacoes = v_observacoes
    where id = p_fornecedor_id
      and restaurante_id = p_restaurante_id
    returning * into v_registro;

    if not found then
      raise exception 'Fornecedor não encontrado neste restaurante.' using errcode = 'PT404';
    end if;
  end if;

  return jsonb_build_object(
    'id', v_registro.id,
    'nome', v_registro.nome,
    'categoria', v_registro.categoria,
    'contato', v_registro.contato,
    'email', v_registro.email,
    'observacoes', v_registro.observacoes,
    'ativo', v_registro.ativo,
    'criado_em', v_registro.criado_em
  );
end;
$$;

-- Ativa ou desativa um fornecedor; operação exclusiva do dono ativo do restaurante.
create or replace function public.alterar_status_fornecedor(
  p_restaurante_id uuid,
  p_fornecedor_id uuid,
  p_ativo boolean
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
begin
  if v_solicitante is null or p_restaurante_id is null or p_fornecedor_id is null or p_ativo is null then
    raise exception 'Apenas o dono do restaurante pode alterar fornecedores.' using errcode = '42501';
  end if;

  perform 1
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante
    and m.restaurante_id = p_restaurante_id
    and m.papel = 'dono'
    and m.ativo = true
  for share;

  if not found then
    raise exception 'Apenas o dono do restaurante pode alterar fornecedores.' using errcode = '42501';
  end if;

  update public.fornecedores
  set ativo = p_ativo
  where id = p_fornecedor_id
    and restaurante_id = p_restaurante_id;

  if not found then
    raise exception 'Fornecedor não encontrado neste restaurante.' using errcode = 'PT404';
  end if;

  return p_ativo;
end;
$$;

revoke all on function public.listar_fornecedores_restaurante(uuid) from public, anon, authenticated;
revoke all on function public.salvar_fornecedor_restaurante(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.alterar_status_fornecedor(uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.listar_fornecedores_restaurante(uuid) to authenticated;
grant execute on function public.salvar_fornecedor_restaurante(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.alterar_status_fornecedor(uuid, uuid, boolean) to authenticated;

commit;
