-- Associa um nome público de login à conta já existente no Supabase Auth.
begin;

create table public.nomes_usuario (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome_usuario text not null check (nome_usuario ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,31}$')
);

-- O índice faz com que nomes como "Cozinha.Piloto" e "cozinha.piloto" sejam o mesmo nome de login.
create unique index nomes_usuario_sem_distincao_de_caixa
  on public.nomes_usuario (lower(nome_usuario));

alter table public.nomes_usuario enable row level security;
revoke all on public.nomes_usuario from public, anon, authenticated;

-- A função é exclusiva do servidor. O navegador nunca recebe o e-mail associado ao nome.
create function public.email_para_nome_usuario(p_nome_usuario text) returns text
language sql stable security definer set search_path = '' as $$
  select conta.email::text
    from public.nomes_usuario as nome
    join auth.users as conta on conta.id = nome.usuario_id
    where lower(nome.nome_usuario) = lower(btrim(p_nome_usuario));
$$;

revoke all on function public.email_para_nome_usuario(text) from public, anon, authenticated;
grant execute on function public.email_para_nome_usuario(text) to service_role;

commit;
