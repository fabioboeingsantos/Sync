-- Mantém paridade com a versão 20261124001000 registrada no histórico remoto; a função email_cadastrado é garantida em 20261124001100.
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

revoke all on function public.email_cadastrado(text) from public, anon, authenticated;
grant execute on function public.email_cadastrado(text) to service_role;

commit;
