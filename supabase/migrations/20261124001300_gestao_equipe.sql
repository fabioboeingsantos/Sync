-- Adiciona gestão de acessos da equipe (REQ-F-004 / SEC-06) restrita ao dono ativo do restaurante.
-- A revogação marca ativo = false imediatamente; as políticas RLS e RPCs existentes bloqueiam a sessão aberta.
begin;

-- Lista membros ativos e inativos do restaurante somente para quem é dono ativo daquele restaurante.
create or replace function public.listar_equipe_restaurante(p_restaurante_id uuid)
returns table (
  usuario_id uuid,
  nome_usuario text,
  email text,
  papel text,
  ativo boolean
)
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
begin
  if v_solicitante is null or p_restaurante_id is null then
    raise exception 'Apenas o dono do restaurante pode consultar a equipe.' using errcode = '42501';
  end if;

  perform 1
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante
    and m.restaurante_id = p_restaurante_id
    and m.papel = 'dono'
    and m.ativo = true;

  if not found then
    raise exception 'Apenas o dono do restaurante pode consultar a equipe.' using errcode = '42501';
  end if;

  return query
  select
    m.usuario_id,
    n.nome_usuario,
    u.email::text,
    m.papel,
    m.ativo
  from public.membros_restaurante as m
  join auth.users as u on u.id = m.usuario_id
  left join public.nomes_usuario as n on n.usuario_id = m.usuario_id
  where m.restaurante_id = p_restaurante_id
  order by m.ativo desc, (m.papel = 'dono') desc, coalesce(n.nome_usuario, u.email) asc;
end;
$$;

-- Vincula (ou reativa) uma conta existente ao restaurante pelo usuário único ou e-mail.
create or replace function public.vincular_membro_restaurante(
  p_restaurante_id uuid,
  p_identificador text,
  p_papel text default 'funcionario'
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
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
    raise exception 'Apenas o dono do restaurante pode liberar acessos.' using errcode = '42501';
  end if;

  -- Bloqueia o vínculo do dono durante a transação para garantir autorização até o commit.
  perform 1
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante
    and m.restaurante_id = p_restaurante_id
    and m.papel = 'dono'
    and m.ativo = true
  for share;

  if not found then
    raise exception 'Apenas o dono do restaurante pode liberar acessos.' using errcode = '42501';
  end if;

  if v_identificador = '' or length(v_identificador) > 254 then
    raise exception 'Informe um usuário ou e-mail válido.' using errcode = '22023';
  end if;

  if v_papel not in ('funcionario', 'dono') then
    raise exception 'Perfil inválido. Escolha funcionário ou dono.' using errcode = '22023';
  end if;

  if position('@' in v_identificador) > 0 then
    select u.id, u.email::text, n.nome_usuario
      into v_alvo_id, v_alvo_email, v_alvo_nome
    from auth.users as u
    left join public.nomes_usuario as n on n.usuario_id = u.id
    where lower(u.email) = v_identificador
    limit 1;
  else
    select u.id, u.email::text, n.nome_usuario
      into v_alvo_id, v_alvo_email, v_alvo_nome
    from public.nomes_usuario as n
    join auth.users as u on u.id = n.usuario_id
    where lower(n.nome_usuario) = v_identificador
    limit 1;
  end if;

  if v_alvo_id is null then
    raise exception 'Nenhuma conta cadastrada foi encontrada para esse usuário ou e-mail.' using errcode = 'PT404';
  end if;

  select m.papel, m.ativo
    into v_papel_atual, v_ativo_atual
  from public.membros_restaurante as m
  where m.restaurante_id = p_restaurante_id
    and m.usuario_id = v_alvo_id
  for update;

  -- Impede deixar o restaurante sem nenhum dono ativo ao rebaixar o único dono.
  if v_ativo_atual is true and v_papel_atual = 'dono' and v_papel <> 'dono' then
    select count(*) into v_donos_ativos
    from public.membros_restaurante as m
    where m.restaurante_id = p_restaurante_id
      and m.papel = 'dono'
      and m.ativo = true;
    if v_donos_ativos <= 1 then
      raise exception 'O restaurante precisa manter ao menos um dono ativo.' using errcode = 'PT409';
    end if;
  end if;

  insert into public.membros_restaurante (restaurante_id, usuario_id, papel, ativo)
  values (p_restaurante_id, v_alvo_id, v_papel, true)
  on conflict (usuario_id, restaurante_id)
  do update set papel = excluded.papel, ativo = true;

  return jsonb_build_object(
    'usuario_id', v_alvo_id,
    'nome_usuario', v_alvo_nome,
    'email', v_alvo_email,
    'papel', v_papel,
    'ativo', true
  );
end;
$$;

-- Revoga imediatamente o acesso de um membro ao restaurante, preservando ao menos um dono ativo.
create or replace function public.remover_membro_restaurante(
  p_restaurante_id uuid,
  p_usuario_id uuid
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_solicitante uuid := auth.uid();
  v_papel_alvo text;
  v_ativo_alvo boolean;
  v_donos_ativos integer;
begin
  if v_solicitante is null or p_restaurante_id is null or p_usuario_id is null then
    raise exception 'Apenas o dono do restaurante pode remover acessos.' using errcode = '42501';
  end if;

  perform 1
  from public.membros_restaurante as m
  where m.usuario_id = v_solicitante
    and m.restaurante_id = p_restaurante_id
    and m.papel = 'dono'
    and m.ativo = true
  for share;

  if not found then
    raise exception 'Apenas o dono do restaurante pode remover acessos.' using errcode = '42501';
  end if;

  select m.papel, m.ativo
    into v_papel_alvo, v_ativo_alvo
  from public.membros_restaurante as m
  where m.restaurante_id = p_restaurante_id
    and m.usuario_id = p_usuario_id
  for update;

  if not found then
    raise exception 'Membro não encontrado neste restaurante.' using errcode = 'PT404';
  end if;

  if v_ativo_alvo is false then
    return false;
  end if;

  if v_papel_alvo = 'dono' then
    select count(*) into v_donos_ativos
    from public.membros_restaurante as m
    where m.restaurante_id = p_restaurante_id
      and m.papel = 'dono'
      and m.ativo = true;
    if v_donos_ativos <= 1 then
      raise exception 'O restaurante precisa manter ao menos um dono ativo.' using errcode = 'PT409';
    end if;
  end if;

  update public.membros_restaurante
  set ativo = false
  where restaurante_id = p_restaurante_id
    and usuario_id = p_usuario_id;

  return true;
end;
$$;

revoke all on function public.listar_equipe_restaurante(uuid) from public, anon, authenticated;
revoke all on function public.vincular_membro_restaurante(uuid, text, text) from public, anon, authenticated;
revoke all on function public.remover_membro_restaurante(uuid, uuid) from public, anon, authenticated;

grant execute on function public.listar_equipe_restaurante(uuid) to authenticated;
grant execute on function public.vincular_membro_restaurante(uuid, text, text) to authenticated;
grant execute on function public.remover_membro_restaurante(uuid, uuid) to authenticated;

commit;
