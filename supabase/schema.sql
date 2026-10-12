-- Ejecuta este script en Supabase > SQL Editor

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(12,0) not null check (price >= 0),
  category text not null,            -- Anillos | Collares | Aretes | Pulseras
  material text not null default '',
  image_url text not null,           -- URL de ImgBB
  featured boolean not null default false,
  stock integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  email text not null,
  phone text not null,
  address text not null,
  city text not null,
  notes text,
  items jsonb not null,
  total numeric(12,0) not null,
  status text not null default 'pendiente',
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Productos: lectura pública, escritura solo usuarios autenticados (admin)
drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products for select using (true);

drop policy if exists "products_write" on public.products;
create policy "products_write" on public.products for all
  to authenticated using (true) with check (true);

-- Pedidos: cualquiera puede crear, solo admin puede ver/editar
drop policy if exists "orders_insert" on public.orders;
create policy "orders_insert" on public.orders for insert
  to anon, authenticated with check (true);

drop policy if exists "orders_admin" on public.orders;
create policy "orders_admin" on public.orders for select
  to authenticated using (true);

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders for update
  to authenticated using (true) with check (true);

-- Datos de ejemplo
insert into public.products (name, description, price, category, material, image_url, featured, stock) values
('Anillo Solitario Aurora', 'Diamante de corte brillante engastado en oro amarillo de 18k.', 4890000, 'Anillos', 'Oro 18k · Diamante', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=900&q=80', true, 5),
('Collar Lágrima de Luna', 'Perla cultivada con cadena fina de oro blanco.', 2350000, 'Collares', 'Oro blanco · Perla', 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=900&q=80', true, 8),
('Aretes Constelación', 'Zirconias talladas a mano sobre plata 925 bañada en oro.', 890000, 'Aretes', 'Plata 925 · Baño de oro', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=900&q=80', false, 12),
('Pulsera Eterna', 'Eslabones articulados con acabado pulido espejo.', 1790000, 'Pulseras', 'Oro 18k', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=900&q=80', true, 6),
('Anillo Vía Láctea', 'Banda de pavé con 42 diamantes pequeños.', 3250000, 'Anillos', 'Oro rosado · Diamantes', 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&q=80', false, 4),
('Collar Soberana', 'Gargantilla con esmeralda colombiana central.', 6900000, 'Collares', 'Oro 18k · Esmeralda', 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900&q=80', true, 2),
('Pulsera Cadena Real', 'Cadena cubana de oro macizo con cierre de seguridad.', 5400000, 'Pulseras', 'Oro 18k', 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&q=80', false, 3),
('Aretes Gota de Rocío', 'Aretes colgantes con topacio azul y halo de brillantes.', 2980000, 'Aretes', 'Oro blanco · Topacio', 'https://images.unsplash.com/photo-1630019852942-f89202989a59?w=900&q=80', false, 7);
