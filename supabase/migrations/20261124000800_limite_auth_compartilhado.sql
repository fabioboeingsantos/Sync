-- Cria limites persistentes para tentativas de autenticação compartilhados entre instâncias serverless.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.limites_autenticacao (
  operacao text not null check (operacao in ('login', 'cadastro')),
  chave_hash text not null check (chave_hash ~ '^[a-f0-9]{64}$'),
  tentativas integer not null default 0 check (tentativas >= 0),
  janela_inicio timestamptz not null default now(),
  bloqueado_ate timestamptz,
  atualizado_em timestamptz not null default now(),
  primary key (operacao, chave_hash)
);

-- Só a função do servidor pode consultar ou alterar os registros privados do limitador.
revoke all on private.limites_autenticacao from public, anon, authenticated;
grant all on private.limites_autenticacao to service_role;

create or replace function public.controle_limite_autenticacao(
  p_acao text, p_operacao text, p_chave text,
  p_limite integer, p_janela_segundos integer, p_bloqueio_segundos integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_agora timestamptz := clock_timestamp();
  v_linha private.limites_autenticacao%rowtype;
  v_retorno jsonb;
begin
  if p_operacao not in ('login', 'cadastro') or p_chave !~ '^[a-f0-9]{64}$'
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
