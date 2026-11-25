-- Adiciona confirmação opcional de e-mail do VisionChef, separada do estado automático do Supabase Auth.
begin;

-- Mantém a decisão de confirmação no perfil privado do usuário, sem liberar acesso ao restaurante.
alter table public.nomes_usuario
  add column if not exists email_verificado_em timestamptz;

-- Armazena somente o hash do token temporário; o valor original segue apenas no e-mail.
create table if not exists private.tokens_verificacao_email (
  usuario_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$'),
  criado_em timestamptz not null default clock_timestamp(),
  expira_em timestamptz not null,
  usado_em timestamptz,
  primary key (usuario_id, token_hash)
);
revoke all on private.tokens_verificacao_email from public, anon, authenticated;
grant all on private.tokens_verificacao_email to service_role;

-- Deixa a função compartilhada limitar também pedidos repetidos de confirmação de e-mail.
alter table private.limites_autenticacao
  drop constraint if exists limites_autenticacao_operacao_check;
alter table private.limites_autenticacao
  add constraint limites_autenticacao_operacao_check check (operacao in ('login', 'cadastro', 'confirmacao'));

-- Emite um token de 24 horas e invalida pedidos anteriores ainda não usados da mesma conta.
create or replace function public.emitir_verificacao_email(p_usuario_id uuid, p_token_hash text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_confirmado timestamptz;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Token inválido.' using errcode = '22023';
  end if;
  select email_verificado_em into v_confirmado
    from public.nomes_usuario where usuario_id = p_usuario_id for update;
  if not found then
    raise exception 'Conta não encontrada.' using errcode = 'P0002';
  end if;
  if v_confirmado is not null then return false; end if;

  update private.tokens_verificacao_email set usado_em = clock_timestamp()
    where usuario_id = p_usuario_id and usado_em is null;
  insert into private.tokens_verificacao_email (usuario_id, token_hash, expira_em)
    values (p_usuario_id, p_token_hash, clock_timestamp() + interval '24 hours');
  return true;
end;
$$;

-- Consome o token uma única vez e grava o estado facultativo no perfil do VisionChef.
create or replace function public.consumir_verificacao_email(p_token_hash text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario_id uuid;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  update private.tokens_verificacao_email set usado_em = clock_timestamp()
    where token_hash = p_token_hash and usado_em is null and expira_em > clock_timestamp()
    returning usuario_id into v_usuario_id;
  if v_usuario_id is null then return false; end if;
  update public.nomes_usuario set email_verificado_em = coalesce(email_verificado_em, clock_timestamp())
    where usuario_id = v_usuario_id;
  return found;
end;
$$;

-- Retorna apenas o estado e a data de confirmação, sem expor dados de outras contas.
create or replace function public.estado_verificacao_email(p_usuario_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('verificado', email_verificado_em is not null, 'verificado_em', email_verificado_em)
    from public.nomes_usuario where usuario_id = p_usuario_id;
$$;

-- Só Edge Functions autenticadas com a chave de servidor podem emitir, consumir ou consultar tokens.
revoke all on function public.emitir_verificacao_email(uuid, text) from public, anon, authenticated;
revoke all on function public.consumir_verificacao_email(text) from public, anon, authenticated;
revoke all on function public.estado_verificacao_email(uuid) from public, anon, authenticated;
grant execute on function public.emitir_verificacao_email(uuid, text) to service_role;
grant execute on function public.consumir_verificacao_email(text) to service_role;
grant execute on function public.estado_verificacao_email(uuid) to service_role;

-- Permite que a função compartilhada aplique o limite específico de confirmações.
create or replace function public.controle_limite_autenticacao(
  p_acao text, p_operacao text, p_chave text,
  p_limite integer, p_janela_segundos integer, p_bloqueio_segundos integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_agora timestamptz := clock_timestamp();
  v_linha private.limites_autenticacao%rowtype;
begin
  if p_operacao not in ('login', 'cadastro', 'confirmacao') or p_chave !~ '^[a-f0-9]{64}$'
    or p_limite < 1 or p_limite > 100 or p_janela_segundos < 30 or p_janela_segundos > 86400
    or p_bloqueio_segundos < 30 or p_bloqueio_segundos > 86400
    or p_acao not in ('verificar', 'reset') then
    raise exception 'Parâmetros inválidos para limite de autenticação.' using errcode = '22023';
  end if;

  if p_acao = 'reset' then
    delete from private.limites_autenticacao where operacao = p_operacao and chave_hash = p_chave;
    return jsonb_build_object('permitido', true, 'retry_after', 0);
  end if;

  insert into private.limites_autenticacao (operacao, chave_hash, tentativas, janela_inicio)
    values (p_operacao, p_chave, 0, v_agora)
    on conflict (operacao, chave_hash) do nothing;
  select * into v_linha from private.limites_autenticacao
    where operacao = p_operacao and chave_hash = p_chave for update;

  if v_linha.bloqueado_ate is not null and v_linha.bloqueado_ate > v_agora then
    return jsonb_build_object('permitido', false, 'retry_after', ceil(extract(epoch from (v_linha.bloqueado_ate - v_agora))));
  end if;
  if v_linha.janela_inicio + make_interval(secs => p_janela_segundos) <= v_agora then
    update private.limites_autenticacao set tentativas = 1, janela_inicio = v_agora,
      bloqueado_ate = null, atualizado_em = v_agora
      where operacao = p_operacao and chave_hash = p_chave;
    return jsonb_build_object('permitido', true, 'retry_after', 0);
  end if;
  if v_linha.tentativas >= p_limite then
    update private.limites_autenticacao set bloqueado_ate = v_agora + make_interval(secs => p_bloqueio_segundos), atualizado_em = v_agora
      where operacao = p_operacao and chave_hash = p_chave;
    return jsonb_build_object('permitido', false, 'retry_after', p_bloqueio_segundos);
  end if;
  update private.limites_autenticacao set tentativas = tentativas + 1, atualizado_em = v_agora
    where operacao = p_operacao and chave_hash = p_chave;
  return jsonb_build_object('permitido', true, 'retry_after', 0);
end;
$$;

revoke all on function public.controle_limite_autenticacao(text, text, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.controle_limite_autenticacao(text, text, text, integer, integer, integer) to service_role;

commit;
