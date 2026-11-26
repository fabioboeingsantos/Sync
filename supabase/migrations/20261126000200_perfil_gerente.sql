-- Adiciona o perfil Gerente com acesso operacional completo e limites de propriedade do restaurante.
begin;

alter table public.membros_restaurante
  drop constraint if exists membros_restaurante_papel_check;
alter table public.membros_restaurante
  add constraint membros_restaurante_papel_check
  check (papel in ('dono', 'gerente', 'funcionario'));

-- Dono e gerente podem consultar o histórico de desperdício; outros funcionários não.
drop policy if exists dono_consulta_saidas on public.saidas_estoque;
create policy dono_gerente_consulta_saidas on public.saidas_estoque for select to authenticated using (
  exists (
    select 1 from public.membros_restaurante as m
    where m.restaurante_id = saidas_estoque.restaurante_id
      and m.usuario_id = (select auth.uid())
      and m.ativo
      and m.papel in ('dono', 'gerente')
  )
);

-- Dono e gerente consultam a equipe; a política RPC continua validando o papel ativo.
create or replace function public.listar_equipe_restaurante(p_restaurante_id uuid)
returns table (usuario_id uuid, nome_usuario text, email text, papel text, ativo boolean)
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
begin
  if v_solicitante is null or p_restaurante_id is null then
    raise exception 'Apenas dono ou gerente do restaurante pode consultar a equipe.' using errcode = '42501';
  end if;

  perform 1 from public.membros_restaurante as m
  where m.usuario_id = v_solicitante and m.restaurante_id = p_restaurante_id
    and m.papel in ('dono', 'gerente') and m.ativo = true;
  if not found then
    raise exception 'Apenas dono ou gerente do restaurante pode consultar a equipe.' using errcode = '42501';
  end if;

  return query
  select m.usuario_id, n.nome_usuario, u.email::text, m.papel, m.ativo
  from public.membros_restaurante as m
  join auth.users as u on u.id = m.usuario_id
  left join public.nomes_usuario as n on n.usuario_id = m.usuario_id
  where m.restaurante_id = p_restaurante_id
  order by m.ativo desc, (m.papel = 'dono') desc, (m.papel = 'gerente') desc,
    coalesce(n.nome_usuario, u.email) asc;
end;
$$;

-- Gerentes podem administrar a equipe, mas somente o dono altera vínculos de donos.
create or replace function public.vincular_membro_restaurante(
  p_restaurante_id uuid,
  p_identificador text,
  p_papel text default 'funcionario'
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
  v_papel_solicitante text;
  v_identificador text := lower(btrim(coalesce(p_identificador, '')));
  v_papel text := lower(btrim(coalesce(p_papel, 'funcionario')));
  v_alvo_id uuid;
  v_alvo_email text;
  v_alvo_nome text;
  v_papel_atual text;
  v_ativo_atual boolean;
  v_donos_ativos integer;
begin
  if v_solicitante is null or p_restaurante_id is null then
    raise exception 'Apenas dono ou gerente do restaurante pode liberar acessos.' using errcode = '42501';
  end if;

  select m.papel into v_papel_solicitante
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante and m.restaurante_id = p_restaurante_id
    and m.papel in ('dono', 'gerente') and m.ativo = true
  for share;
  if not found then
    raise exception 'Apenas dono ou gerente do restaurante pode liberar acessos.' using errcode = '42501';
  end if;

  if v_identificador = '' or length(v_identificador) > 254 then
    raise exception 'Informe um usuário ou e-mail válido.' using errcode = '22023';
  end if;
  if v_papel not in ('funcionario', 'gerente', 'dono') then
    raise exception 'Perfil inválido. Escolha funcionário, gerente ou dono.' using errcode = '22023';
  end if;

  if position('@' in v_identificador) > 0 then
    select u.id, u.email::text, n.nome_usuario into v_alvo_id, v_alvo_email, v_alvo_nome
    from auth.users as u
    left join public.nomes_usuario as n on n.usuario_id = u.id
    where lower(u.email) = v_identificador limit 1;
  else
    select u.id, u.email::text, n.nome_usuario into v_alvo_id, v_alvo_email, v_alvo_nome
    from public.nomes_usuario as n
    join auth.users as u on u.id = n.usuario_id
    where lower(n.nome_usuario) = v_identificador limit 1;
  end if;
  if v_alvo_id is null then
    raise exception 'Nenhuma conta cadastrada foi encontrada para esse usuário ou e-mail.' using errcode = 'PT404';
  end if;

  select m.papel, m.ativo into v_papel_atual, v_ativo_atual
  from public.membros_restaurante as m
  where m.restaurante_id = p_restaurante_id and m.usuario_id = v_alvo_id
  for update;

  if v_papel_solicitante = 'gerente'
    and (v_papel = 'dono' or v_papel_atual = 'dono') then
    raise exception 'Somente o dono pode conceder ou alterar o perfil de dono.' using errcode = '42501';
  end if;

  if v_ativo_atual is true and v_papel_atual = 'dono' and v_papel <> 'dono' then
    select count(*) into v_donos_ativos
    from public.membros_restaurante as m
    where m.restaurante_id = p_restaurante_id and m.papel = 'dono' and m.ativo = true;
    if v_donos_ativos <= 1 then
      raise exception 'O restaurante precisa manter ao menos um dono ativo.' using errcode = 'PT409';
    end if;
  end if;

  insert into public.membros_restaurante (restaurante_id, usuario_id, papel, ativo)
  values (p_restaurante_id, v_alvo_id, v_papel, true)
  on conflict (usuario_id, restaurante_id)
  do update set papel = excluded.papel, ativo = true;

  return jsonb_build_object('usuario_id', v_alvo_id, 'nome_usuario', v_alvo_nome,
    'email', v_alvo_email, 'papel', v_papel, 'ativo', true);
end;
$$;

-- Gerente pode revogar funcionários e gerentes, mas não o acesso de um dono.
create or replace function public.remover_membro_restaurante(
  p_restaurante_id uuid,
  p_usuario_id uuid
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
  v_papel_solicitante text;
  v_papel_alvo text;
  v_ativo_alvo boolean;
  v_donos_ativos integer;
begin
  if v_solicitante is null or p_restaurante_id is null or p_usuario_id is null then
    raise exception 'Apenas dono ou gerente do restaurante pode remover acessos.' using errcode = '42501';
  end if;

  select m.papel into v_papel_solicitante
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante and m.restaurante_id = p_restaurante_id
    and m.papel in ('dono', 'gerente') and m.ativo = true
  for share;
  if not found then
    raise exception 'Apenas dono ou gerente do restaurante pode remover acessos.' using errcode = '42501';
  end if;

  select m.papel, m.ativo into v_papel_alvo, v_ativo_alvo
  from public.membros_restaurante as m
  where m.restaurante_id = p_restaurante_id and m.usuario_id = p_usuario_id
  for update;
  if not found then
    raise exception 'Membro não encontrado neste restaurante.' using errcode = 'PT404';
  end if;
  if v_ativo_alvo is false then return false; end if;

  if v_papel_solicitante = 'gerente' and v_papel_alvo = 'dono' then
    raise exception 'Somente o dono pode remover o acesso de um dono.' using errcode = '42501';
  end if;

  if v_papel_alvo = 'dono' then
    select count(*) into v_donos_ativos
    from public.membros_restaurante as m
    where m.restaurante_id = p_restaurante_id and m.papel = 'dono' and m.ativo = true;
    if v_donos_ativos <= 1 then
      raise exception 'O restaurante precisa manter ao menos um dono ativo.' using errcode = 'PT409';
    end if;
  end if;

  update public.membros_restaurante set ativo = false
  where restaurante_id = p_restaurante_id and usuario_id = p_usuario_id;
  return true;
end;
$$;

-- Dono e gerente têm acesso completo aos fornecedores; funcionários continuam vendo apenas os ativos.
create or replace function public.listar_fornecedores_restaurante(p_restaurante_id uuid)
returns table (id uuid, nome text, categoria text, contato text, email text,
  observacoes text, ativo boolean, criado_em timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
  v_papel text;
begin
  if v_solicitante is null or p_restaurante_id is null then
    raise exception 'Sem acesso aos fornecedores deste restaurante.' using errcode = '42501';
  end if;
  select m.papel into v_papel from public.membros_restaurante as m
  where m.usuario_id = v_solicitante and m.restaurante_id = p_restaurante_id and m.ativo = true;
  if not found then
    raise exception 'Sem acesso aos fornecedores deste restaurante.' using errcode = '42501';
  end if;
  return query
  select f.id, f.nome, f.categoria, f.contato, f.email, f.observacoes, f.ativo, f.criado_em
  from public.fornecedores as f
  where f.restaurante_id = p_restaurante_id and (v_papel in ('dono', 'gerente') or f.ativo = true)
  order by f.ativo desc, lower(f.nome) asc, f.id asc;
end;
$$;

-- Dono e gerente podem criar ou editar fornecedores.
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
    raise exception 'Apenas dono ou gerente do restaurante pode gerenciar fornecedores.' using errcode = '42501';
  end if;
  perform 1 from public.membros_restaurante as m
  where m.usuario_id = v_solicitante and m.restaurante_id = p_restaurante_id
    and m.papel in ('dono', 'gerente') and m.ativo = true
  for share;
  if not found then
    raise exception 'Apenas dono ou gerente do restaurante pode gerenciar fornecedores.' using errcode = '42501';
  end if;
  if length(v_nome) < 1 or length(v_nome) > 120 then
    raise exception 'Informe o nome do fornecedor (até 120 caracteres).' using errcode = '22023';
  end if;
  if v_email is not null and v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'Informe um e-mail válido para o fornecedor.' using errcode = '22023';
  end if;
  if p_fornecedor_id is null then
    insert into public.fornecedores (restaurante_id, nome, categoria, contato, email, observacoes, criado_por)
    values (p_restaurante_id, v_nome, v_categoria, v_contato, v_email, v_observacoes, v_solicitante)
    returning * into v_registro;
  else
    update public.fornecedores set nome = v_nome, categoria = v_categoria, contato = v_contato,
      email = v_email, observacoes = v_observacoes
    where id = p_fornecedor_id and restaurante_id = p_restaurante_id returning * into v_registro;
    if not found then raise exception 'Fornecedor não encontrado neste restaurante.' using errcode = 'PT404'; end if;
  end if;
  return jsonb_build_object('id', v_registro.id, 'nome', v_registro.nome,
    'categoria', v_registro.categoria, 'contato', v_registro.contato, 'email', v_registro.email,
    'observacoes', v_registro.observacoes, 'ativo', v_registro.ativo, 'criado_em', v_registro.criado_em);
end;
$$;

-- Dono e gerente podem ativar ou desativar fornecedores.
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
    raise exception 'Apenas dono ou gerente do restaurante pode alterar fornecedores.' using errcode = '42501';
  end if;
  perform 1 from public.membros_restaurante as m
  where m.usuario_id = v_solicitante and m.restaurante_id = p_restaurante_id
    and m.papel in ('dono', 'gerente') and m.ativo = true
  for share;
  if not found then
    raise exception 'Apenas dono ou gerente do restaurante pode alterar fornecedores.' using errcode = '42501';
  end if;
  update public.fornecedores set ativo = p_ativo
  where id = p_fornecedor_id and restaurante_id = p_restaurante_id;
  if not found then raise exception 'Fornecedor não encontrado neste restaurante.' using errcode = 'PT404'; end if;
  return p_ativo;
end;
$$;

revoke all on function public.listar_equipe_restaurante(uuid) from public, anon, authenticated;
revoke all on function public.vincular_membro_restaurante(uuid, text, text) from public, anon, authenticated;
revoke all on function public.remover_membro_restaurante(uuid, uuid) from public, anon, authenticated;
revoke all on function public.listar_fornecedores_restaurante(uuid) from public, anon, authenticated;
revoke all on function public.salvar_fornecedor_restaurante(uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.alterar_status_fornecedor(uuid, uuid, boolean) from public, anon, authenticated;

grant execute on function public.listar_equipe_restaurante(uuid) to authenticated;
grant execute on function public.vincular_membro_restaurante(uuid, text, text) to authenticated;
grant execute on function public.remover_membro_restaurante(uuid, uuid) to authenticated;
grant execute on function public.listar_fornecedores_restaurante(uuid) to authenticated;
grant execute on function public.salvar_fornecedor_restaurante(uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.alterar_status_fornecedor(uuid, uuid, boolean) to authenticated;

commit;
