-- MIGRACIÓN 003 · Listar todas las cuentas y dar/quitar acceso desde el panel
-- Requisito: haber ejecutado la migración 002.
-- Es segura de ejecutar más de una vez.

-- 1) Lista de todas las cuentas registradas (solo root)
create or replace function public.list_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  has_access boolean,
  role text,
  active boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_root() then
    raise exception 'Solo el root puede ver los usuarios';
  end if;

  return query
  select
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    (a.user_id is not null),
    a.role,
    a.active
  from auth.users u
  left join public.admins a on a.user_id = u.id
  order by (a.role = 'root') desc nulls last, (a.user_id is not null) desc, u.created_at asc;
end;
$$;

-- 2) Dar o quitar acceso al panel a una cuenta (solo root)
create or replace function public.set_user_access(p_user uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_root() then
    raise exception 'Solo el root puede administrar usuarios';
  end if;

  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Esa cuenta no existe';
  end if;

  if p_enabled then
    insert into public.admins (user_id, email, role, active)
    select u.id, u.email, 'admin', true from auth.users u where u.id = p_user
    on conflict (user_id) do update set active = true, email = excluded.email;
  else
    if p_user = auth.uid() then
      raise exception 'No puedes quitarte el acceso a ti mismo';
    end if;
    -- Se conserva la fila (active = false) para poder reactivar con un clic.
    -- El trigger protect_last_root impide dejar el sistema sin root.
    update public.admins set active = false where user_id = p_user;
  end if;
end;
$$;

revoke all on function public.list_users() from public, anon;
revoke all on function public.set_user_access(uuid, boolean) from public, anon;
grant execute on function public.list_users() to authenticated;
grant execute on function public.set_user_access(uuid, boolean) to authenticated;
