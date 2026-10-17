import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
    const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin");
    if (!adminErr && !isAdmin) return fail("Tu usuario no es administrador", 403);

    const body = (await req.json().catch(() => ({}))) as { urls?: unknown };
    const urls = Array.isArray(body.urls) ? body.urls.filter((u): u is string => typeof u === "string").slice(0, 30) : [];

    const results: { url: string; status: "deleted" | "unknown" | "failed" }[] = [];
    for (const imageUrl of urls) {
      const { data: row, error: selErr } = await sb.from("image_deletes").select("delete_url").eq("url", imageUrl).maybeSingle();
      if (selErr || !row?.delete_url || !isImgbbUrl(row.delete_url)) {
        results.push({ url: imageUrl, status: "unknown" }); // imagen externa o subida antes de la migración 008
        continue;
      }
      try {
        const target = new URL(row.delete_url);
        target.searchParams.set("key", apiKey);
        const res = await fetch(target, { method: "DELETE" });
        const text = await res.text();
        let apiError: unknown;
        try {
          apiError = (JSON.parse(text) as { error?: unknown }).error;
        } catch {}
        // 404/410: ya no existe en ImgBB; se considera borrada.
        if ((res.ok && !apiError) || res.status === 404 || res.status === 410) {
          await sb.from("image_deletes").delete().eq("url", imageUrl);
          results.push({ url: imageUrl, status: "deleted" });
        } else {
          console.warn("[upload/delete] ImgBB no borró la imagen:", res.status, text.slice(0, 200));
          results.push({ url: imageUrl, status: "failed" });
        }
      } catch (e) {
        console.warn("[upload/delete] Error al contactar ImgBB:", e);
        results.push({ url: imageUrl, status: "failed" });
      }
    }
    return NextResponse.json({ results });
  } catch (err) {
    console.error("[upload/delete] Error inesperado:", err);
    return fail("Error interno", 500);
  }
}