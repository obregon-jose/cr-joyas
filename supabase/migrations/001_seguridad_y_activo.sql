-- MIGRACIÓN 001 · Seguridad de administrador + productos pausables
-- Ejecutar en Supabase > SQL Editor. Es seguro ejecutarla más de una vez.
-- IMPORTANTE: antes de ejecutarla, crea tu usuario admin en Authentication > Users,
-- porque este script lo registra automáticamente como administrador.

-- 1) Tabla de administradores
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- Sin políticas: nadie la lee directamente; solo la función is_admin() (security definer).

-- 2) Registrar como admins a los usuarios que YA existen (tú)
insert into public.admins (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- 3) Función para saber si el usuario actual es admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- 4) Productos pausables (columna nueva, no rompe nada existente)
alter table public.products add column if not exists active boolean not null default true;

-- 5) Políticas: ahora solo los admins escriben, ya no cualquier usuario autenticado
drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select
  using (active = true or public.is_admin());

drop policy if exists "products_write" on public.products;
drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products for all
  to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_admin" on public.orders;
create policy "orders_admin" on public.orders for select
  to authenticated using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update
  to authenticated using (public.is_admin()) with check (public.is_admin());

-- (La política "orders_insert" para clientes anónimos se mantiene igual.)

-- Para agregar otro administrador más adelante:
--   insert into public.admins (user_id) select id from auth.users where email = 'otro@correo.com';
