-- Permite que o backend autenticado por HMAC verifique se um e-mail existe antes de enviar recuperação de senha.
begin;

create or replace function public.email_cadastrado(p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where lower(email) = lower(btrim(coalesce(p_email, '')))
  );
$$;

-- Somente o service_role (usado pelas Edge Functions protegidas por HMAC) pode consultar a existência de contas.
revoke all on function public.email_cadastrado(text) from public, anon, authenticated;
grant execute on function public.email_cadastrado(text) to service_role;

commit;
