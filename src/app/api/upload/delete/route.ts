import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { deleteFromImgbb } from "@/lib/media/imgbb-delete";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

const ALLOWED_HOSTS = ["ibb.co", "imgbb.com"];

function isImgbbUrl(raw: string) {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// Elimina de ImgBB imágenes que ya no se usan. Es "mejor esfuerzo": si algo falla, nunca bloquea al admin.
// Solo borra imágenes que se subieron desde este panel (las que tienen enlace de borrado guardado).
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey || !url || !anon) return NextResponse.json({ results: [] });

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return fail("No autorizado", 401);
    const sb: SupabaseClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) return fail("Sesión inválida", 401);
    let { data: isAdmin, error: adminErr } = await sb.rpc("can_edit");
    if (adminErr) ({ data: isAdmin, error: adminErr } = await sb.rpc("is_admin")); // migración 018 aún no ejecutada
    if (!adminErr && !isAdmin) return fail("Tu usuario no es administrador", 403);

    const body = (await req.json().catch(() => ({}))) as { urls?: unknown; retryPending?: unknown };
    let urls = Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === "string").slice(0, 30) : [];

    // Reintento manual: las que quedaron marcadas como pendientes (requiere la migración 014).
    if (body.retryPending === true) {
      const { data: pend } = await sb.from("image_deletes").select("url").eq("pending", true).limit(30);
      urls = (pend ?? []).map((r: { url: string }) => r.url);
    }

    console.log("[upload/delete] pedido para", urls.length, "imagen(es)");
    const results: { url: string; status: "deleted" | "unknown" | "failed"; detail?: string }[] = [];
    for (const imageUrl of urls) {
      const { data: row, error: selErr } = await sb.from("image_deletes").select("delete_url").eq("url", imageUrl).maybeSingle();
      if (selErr || !row?.delete_url || !isImgbbUrl(row.delete_url)) {
        console.log("[upload/delete] sin enlace de borrado guardado:", imageUrl, selErr ? `(error: ${selErr.message})` : "");
        results.push({ url: imageUrl, status: "unknown", detail: selErr ? selErr.message : "sin enlace de borrado guardado" }); // imagen externa o subida antes de la migración 008
        continue;
      }
      const r = await deleteFromImgbb(row.delete_url, apiKey);
      if (r.ok) {
        console.log("[upload/delete] borrada:", imageUrl, `(${r.via}: ${r.detail})`);
        await sb.from("image_deletes").delete().eq("url", imageUrl);
        results.push({ url: imageUrl, status: "deleted", detail: r.detail });
      } else {
        console.warn("[upload/delete] ImgBB no borró la imagen:", imageUrl, "→", r.detail);
        // Queda marcada como pendiente para poder reintentar (si la migración 014 no está, simplemente no se marca).
        await sb.from("image_deletes").update({ pending: true, last_error: r.detail.slice(0, 300), last_try: new Date().toISOString() }).eq("url", imageUrl);
        results.push({ url: imageUrl, status: "failed", detail: r.detail });
      }
    }
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[upload/delete] Error inesperado:", err);
    return fail("Error interno", 500);
  }
}