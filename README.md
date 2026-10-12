# CR JOYAS · Next.js + Tailwind + Supabase + ImgBB

## Puesta en marcha
1. `npm install`
2. Copia `.env.example` a `.env.local` y completa las claves.
3. En Supabase > SQL Editor ejecuta `supabase/schema.sql` (tablas, RLS y productos de ejemplo).
4. En Supabase > Authentication > Users crea tu usuario administrador (correo + contraseña, con Auto Confirm User).
5. Ejecuta las migraciones de `supabase/migrations/` en orden numérico (001, 002, ...). Cada una es aditiva y segura de repetir.
6. `npm run dev` y abre http://localhost:3000

## Rutas
- `/` tienda completa (si no hay Supabase configurado usa productos de demostración).
- `/admin` panel: login, crear productos con subida de imagen a ImgBB, borrar productos y gestionar pedidos.

## Notas
- La clave `IMGBB_API_KEY` solo vive en el servidor (`/api/upload`), que además exige sesión de Supabase.
- Los pedidos se guardan en la tabla `orders`; solo los usuarios autenticados pueden leerlos (RLS).

## Migraciones
- `001_seguridad_y_activo.sql`: tabla `admins` + función `is_admin()` (solo admins escriben) y columna `active` para pausar productos.
- `002_roles_root_admin.sql`: roles `root`/`admin`, activar o desactivar administradores y pestaña Usuarios (solo root). Promueve a root a jo46646@gmail.com.
- `003_listar_usuarios.sql`: la pestaña Usuarios lista todas las cuentas de Supabase y el root da o quita acceso con un clic.
