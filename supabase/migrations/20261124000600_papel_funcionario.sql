-- Atualiza os vínculos existentes para o papel genérico de funcionário.
begin;

-- Remove a validação anterior para permitir converter os registros sem perder vínculos.
alter table public.membros_restaurante
  drop constraint if exists membros_restaurante_papel_check;

-- Mantém a equipe atual e troca o papel antigo pelo novo nome.
update public.membros_restaurante
set papel = 'funcionario'
where papel = 'cozinheiro';

-- Define os papéis de acesso do piloto e reserva profissões para uma estrutura futura.
alter table public.membros_restaurante
  add constraint membros_restaurante_papel_check
  check (papel in ('dono', 'funcionario'));

commit;
