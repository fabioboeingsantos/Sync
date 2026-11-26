-- Permite que uma conta autenticada sem vínculo crie seu primeiro restaurante e entre como dona.
begin;

-- O controle de reenvio fica privado e os restaurantes anteriores conservam seus vínculos.
create table private.restaurantes_iniciais (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  restaurante_id uuid not null unique references public.restaurantes(id) on delete cascade
);
revoke all on private.restaurantes_iniciais from public, anon, authenticated;

create function public.criar_restaurante_inicial(p_nome text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_usuario uuid := auth.uid();
  v_nome text := btrim(coalesce(p_nome, ''));
  v_id uuid;
  v_nome_criado text;
begin
  if v_usuario is null then
    raise exception 'Entre na sua conta para criar o restaurante.' using errcode = '42501';
  end if;
  if length(v_nome) not between 2 and 120 or v_nome !~ '[^[:space:]]' then
    raise exception 'Informe um nome de restaurante com 2 a 120 caracteres.' using errcode = '22023';
  end if;

  -- Bloqueia a conta durante a transação para que reenvios simultâneos não dupliquem o restaurante.
  perform 1 from auth.users where id = v_usuario for update;
  if not found then
    raise exception 'Conta indisponível.' using errcode = '42501';
  end if;

  select r.id, r.nome into v_id, v_nome_criado
  from private.restaurantes_iniciais as inicial
  join public.restaurantes as r on r.id = inicial.restaurante_id
  where inicial.usuario_id = v_usuario;
  if found then
    -- Uma resposta perdida pode ser repetida, mas um vínculo revogado jamais é reativado por esta rota.
    if exists (
      select 1 from public.membros_restaurante as m
      where m.restaurante_id = v_id and m.usuario_id = v_usuario and m.ativo and m.papel = 'dono'
    ) then
      return jsonb_build_object('id', v_id, 'nome', v_nome_criado);
    end if;
    raise exception 'Esta conta já criou um restaurante. Peça a um dono ativo para liberar seu acesso.' using errcode = 'PT409';
  end if;

  if exists (select 1 from public.membros_restaurante as m where m.usuario_id = v_usuario and m.ativo) then
    raise exception 'Esta conta já tem acesso a um restaurante.' using errcode = 'PT409';
  end if;

  -- O restaurante, o vínculo e o controle de reenvio são gravados na mesma transação.
  insert into public.restaurantes (nome, fuso_horario)
  values (v_nome, 'America/Sao_Paulo')
  returning id into v_id;
  insert into public.membros_restaurante (restaurante_id, usuario_id, papel)
  values (v_id, v_usuario, 'dono');
  insert into private.restaurantes_iniciais (usuario_id, restaurante_id)
  values (v_usuario, v_id);
  return jsonb_build_object('id', v_id, 'nome', v_nome);
end;
$$;

revoke all on function public.criar_restaurante_inicial(text) from public, anon, authenticated;
grant execute on function public.criar_restaurante_inicial(text) to authenticated;

commit;
