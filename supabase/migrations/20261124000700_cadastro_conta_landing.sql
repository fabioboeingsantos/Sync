-- Vincula o nome único informado no cadastro à conta Auth, sem conceder acesso a restaurante.
begin;

create or replace function public.registrar_nome_usuario_auth() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_nome text := lower(btrim(coalesce(new.raw_user_meta_data ->> 'nome_usuario', '')));
begin
  -- Contas administrativas criadas fora do formulário podem continuar sem nome de login.
  if v_nome = '' then return new; end if;
  if v_nome !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then
    raise exception 'Nome de usuário inválido.' using errcode = '23514';
  end if;

  -- O índice único da tabela rejeita nomes duplicados, sem diferenciar maiúsculas e minúsculas.
  insert into public.nomes_usuario (usuario_id, nome_usuario) values (new.id, v_nome);
  return new;
end;
$$;

revoke all on function public.registrar_nome_usuario_auth() from public, anon, authenticated;

-- O trigger executa a associação no servidor durante o cadastro pelo Supabase Auth.
drop trigger if exists registrar_nome_usuario_auth on auth.users;
create trigger registrar_nome_usuario_auth
after insert on auth.users
for each row execute function public.registrar_nome_usuario_auth();

commit;
