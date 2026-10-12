-- MIGRACIÓN 002 · Roles (root / admin) y administración de usuarios
-- Requisitos:
--   1) Haber ejecutado la migración 001.
--   2) Que exista el usuario jo46646@gmail.com en Authentication > Users.
-- Es segura de ejecutar más de una vez.

-- 1) Columnas nuevas en admins
alter table public.admins add column if not exists role text not null default 'admin';
alter table public.admins add column if not exists active boolean not null default true;
alter table public.admins add column if not exists email text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'admins_role_check') then
    alter table public.admins add constraint admins_role_check check (role in ('root', 'admin'));
  end if;
end $$;

-- 2) Guardar el correo de los admins que ya existen
update public.admins a
set email = u.email
from auth.users u
where u.id = a.user_id and a.email is null;

-- 3) Promover a root a jo46646@gmail.com (falla con un mensaje claro si la cuenta no existe)
do $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower('jo46646@gmail.com');
  if v_id is null then
    raise exception 'No existe un usuario con el correo jo46646@gmail.com en Authentication > Users. Créalo primero y vuelve a ejecutar este script.';
  end if;

  insert into public.admins (user_id, email, role, active)
  values (v_id, 'jo46646@gmail.com', 'root', true)
  on conflict (user_id) do update set role = 'root', active = true, email = excluded.email;
end $$;

-- 4) is_admin(): ahora también exige que el admin esté activo
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and active);
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 5) is_root(): admin activo con rol root
create or replace function public.is_root()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins
    where user_id = auth.uid() and active and role = 'root'
  );
$$;
grant execute on function public.is_root() to authenticated;

-- 6) Solo el root puede listar la tabla de administradores
drop policy if exists "admins_root_read" on public.admins;
create policy "admins_root_read" on public.admins for select
  to authenticated using (public.is_root());

-- 7) Protección: nunca puede quedar el sistema sin un root activo
create or replace function public.protect_last_root()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'root' and old.active and (new.role <> 'root' or not new.active) then
    if not exists (
      select 1 from public.admins
      where role = 'root' and active and user_id <> old.user_id
    ) then
      raise exception 'No puedes quitar ni desactivar al último root activo';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists admins_protect_last_root on public.admins;
create trigger admins_protect_last_root
  before update on public.admins
  for each row execute function public.protect_last_root();

-- 8) Activar / desactivar un administrador (solo root)
create or replace function public.set_admin_active(p_user uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_root() then
    raise exception 'Solo el root puede administrar usuarios';
  end if;
  if p_user = auth.uid() and not p_active then
    raise exception 'No puedes desactivarte a ti mismo';
  end if;
  update public.admins set active = p_active where user_id = p_user;
  if not found then
    raise exception 'Ese usuario no es administrador';
  end if;
end;
$$;

-- 9) Agregar un administrador por correo (la cuenta debe existir en Authentication > Users)
create or replace function public.add_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
begin
  if not public.is_root() then
    raise exception 'Solo el root puede administrar usuarios';
  end if;

  select id, email into v_id, v_email
  from auth.users
  where lower(email) = lower(trim(p_email));

  if v_id is null then
    raise exception 'No existe una cuenta con ese correo. Créala primero en Supabase > Authentication > Users.';
  end if;

  insert into public.admins (user_id, email, role, active)
  values (v_id, v_email, 'admin', true)
  on conflict (user_id) do update set active = true, email = excluded.email;
end;
$$;

revoke all on function public.set_admin_active(uuid, boolean) from public, anon;
revoke all on function public.add_admin_by_email(text) from public, anon;
grant execute on function public.set_admin_active(uuid, boolean) to authenticated;
grant execute on function public.add_admin_by_email(text) to authenticated;
