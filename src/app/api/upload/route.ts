import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Sube una imagen a ImgBB. Solo usuarios autenticados en Supabase (admin) pueden usarlo.
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return fail("Falta IMGBB_API_KEY en .env.local (reinicia npm run dev después de agregarla)", 500);
    }

    let sb: SupabaseClient | null = null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anon) {
      const token = req.headers.get("authorization")?.replace("Bearer ", "");
      if (!token) return fail("No autorizado: inicia sesión en /admin", 401);
      sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data, error } = await sb.auth.getUser(token);
      if (error || !data.user) return fail("Sesión inválida, vuelve a iniciar sesión", 401);

      // Solo administradores pueden subir imágenes (requiere la migración 001).
      // Solo quienes pueden editar (root y admin) suben imágenes; si la migración 018 aún no existe se usa is_admin.
      let { data: isAdmin, error: adminErr } = await sb.rpc("can_edit");
      if (adminErr) ({ data: isAdmin, error: adminErr } = await sb.rpc("is_admin"));
      if (adminErr) {
        console.warn("[upload] is_admin() no disponible; ejecuta supabase/migrations/001. Modo anterior activo.");
      } else if (!isAdmin) {
        return fail("Tu usuario no es administrador", 403);
      }
    }

    const form = await req.formData();
    const file = form.get("file");
    // Se usa Blob (y no File) porque File no existe como global en Node 18.
    if (!file || typeof file === "string") return fail("Archivo no enviado", 400);
    const blob = file as Blob & { name?: string };
    if (blob.size > 8 * 1024 * 1024) return fail("La imagen supera 8MB", 400);

    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const body = new URLSearchParams();
    body.set("image", base64);
    body.set("name", (blob.name ?? "producto").replace(/\.[^.]+$/, ""));

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body,
    });

    const text = await res.text();
    let json: { data?: { url?: string; delete_url?: string }; error?: { message?: string } } = {};
    try {
      json = JSON.parse(text);
    } catch {
      console.error("[upload] ImgBB devolvió algo que no es JSON:", res.status, text.slice(0, 200));
      return fail(`ImgBB respondió con un error (${res.status})`, 502);
    }

    if (!res.ok || !json.data?.url) {
      console.error("[upload] ImgBB rechazó la subida:", res.status, json.error);
      return fail(json.error?.message ?? `ImgBB rechazó la imagen (${res.status})`, 502);
    }

    // Se guarda en privado el enlace de borrado (migración 008) para poder eliminar la imagen después.
    // Si la tabla aún no existe, simplemente no se guarda: la subida funciona igual.
    if (sb && json.data.delete_url) {
      const { error: saveErr } = await sb.from("image_deletes").upsert({ url: json.data.url, delete_url: json.data.delete_url });
      if (saveErr) console.warn("[upload] No se guardó el enlace de borrado (¿migración 008?):", saveErr.message);
    }

    return NextResponse.json({ url: json.data.url });
  } catch (err) {
    console.error("[upload] Error inesperado:", err);
    const msg = err instanceof Error ? err.message : "desconocido";
    return fail(`Error interno al subir la imagen: ${msg}`, 500);
  }
}