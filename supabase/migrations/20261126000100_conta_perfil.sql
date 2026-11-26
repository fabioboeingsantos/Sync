-- Permite que cada pessoa consulte e defina apenas o próprio nome de usuário legado.
begin;

create or replace function public.nome_usuario_proprio()
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_nome text;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para consultar o perfil.' using errcode = '42501';
  end if;
  select nome_usuario into v_nome from public.nomes_usuario where usuario_id = v_usuario;
  return v_nome;
end;
$$;

create or replace function public.definir_nome_usuario_proprio(p_nome_usuario text)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_atual text;
  v_novo text := lower(btrim(coalesce(p_nome_usuario, '')));
  v_automatico text;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para definir um nome de usuário.' using errcode = '42501';
  end if;
  if v_novo !~ '^[a-z0-9][a-z0-9._-]{2,31}$' then
    raise exception 'Use de 3 a 32 letras, números, ponto, hífen ou sublinhado.' using errcode = '22023';
  end if;

  select nome_usuario into v_atual from public.nomes_usuario where usuario_id = v_usuario for update;
  v_automatico := 'usuario.' || left(replace(v_usuario::text, '-', ''), 12);
  if v_atual is not null and v_atual <> v_automatico then
    raise exception 'Sua conta já tem um nome de usuário.' using errcode = 'PT409';
  end if;

  insert into public.nomes_usuario (usuario_id, nome_usuario)
  values (v_usuario, v_novo)
  on conflict (usuario_id) do update set nome_usuario = excluded.nome_usuario;
  return v_novo;
end;
$$;

-- RLS continua protegendo a tabela; apenas essas duas funções leem ou alteram a própria linha.
revoke all on function public.nome_usuario_proprio() from public, anon;
revoke all on function public.definir_nome_usuario_proprio(text) from public, anon;
grant execute on function public.nome_usuario_proprio() to authenticated;
grant execute on function public.definir_nome_usuario_proprio(text) to authenticated;

commit;
