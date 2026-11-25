-- Garante que contas criadas diretamente no Supabase Auth (sem linha prévia em public.nomes_usuario)
-- possam consultar, emitir e concluir a confirmação opcional de e-mail do VisionChef.
begin;

-- Preenche perfis ausentes de contas já existentes em auth.users com um nome técnico único e válido.
insert into public.nomes_usuario (usuario_id, nome_usuario)
select
  u.id,
  'usuario.' || left(replace(u.id::text, '-', ''), 12)
from auth.users as u
where not exists (
  select 1 from public.nomes_usuario as n where n.usuario_id = u.id
)
on conflict (usuario_id) do nothing;

-- Sempre devolve um objeto JSON válido mesmo antes de existir linha em nomes_usuario.
create or replace function public.estado_verificacao_email(p_usuario_id uuid)
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (
      select jsonb_build_object('verificado', email_verificado_em is not null, 'verificado_em', email_verificado_em)
      from public.nomes_usuario
      where usuario_id = p_usuario_id
    ),
    jsonb_build_object('verificado', false, 'verificado_em', null)
  );
$$;

-- Se a conta existir em auth.users mas não tiver perfil em nomes_usuario, cria automaticamente antes de emitir o token.
create or replace function public.emitir_verificacao_email(p_usuario_id uuid, p_token_hash text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_confirmado timestamptz;
begin
  if p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'Token inválido.' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users where id = p_usuario_id) then
    raise exception 'Conta não encontrada.' using errcode = 'P0002';
  end if;

  insert into public.nomes_usuario (usuario_id, nome_usuario)
  values (p_usuario_id, 'usuario.' || left(replace(p_usuario_id::text, '-', ''), 12))
  on conflict (usuario_id) do nothing;

  select email_verificado_em into v_confirmado
    from public.nomes_usuario where usuario_id = p_usuario_id for update;
  if v_confirmado is not null then return false; end if;

  update private.tokens_verificacao_email set usado_em = clock_timestamp()
    where usuario_id = p_usuario_id and usado_em is null;
  insert into private.tokens_verificacao_email (usuario_id, token_hash, expira_em)
    values (p_usuario_id, p_token_hash, clock_timestamp() + interval '24 hours');
  return true;
end;
$$;

revoke all on function public.estado_verificacao_email(uuid) from public, anon, authenticated;
revoke all on function public.emitir_verificacao_email(uuid, text) from public, anon, authenticated;
grant execute on function public.estado_verificacao_email(uuid) to service_role;
grant execute on function public.emitir_verificacao_email(uuid, text) to service_role;

commit;
