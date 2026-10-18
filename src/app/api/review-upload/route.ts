import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Límite sencillo por dispositivo: máximo 12 fotos por hora (en memoria de este servidor).
const hits = new Map<string, number[]>();
function allowed(device: string) {
  const now = Date.now();
  const recent = (hits.get(device) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 12) return false;
  recent.push(now);
  hits.set(device, recent);
  return true;
}

// Sube la foto de una reseña a ImgBB. Solo dispositivos con una compra confirmada (función can_review).
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.IMGBB_API_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!apiKey) return fail("Falta IMGBB_API_KEY en .env.local", 500);
    if (!url || !anon) return fail("Supabase no está configurado", 500);

    const device = req.headers.get("x-device-id") ?? "";
    const sb = createClient(url, anon);
    const { data: ok, error: rpcErr } = await sb.rpc("can_review", { p_device: device });
    if (rpcErr) return fail("Falta ejecutar la migración 009 en Supabase", 500);
    if (!ok) return fail("Solo los clientes con una compra confirmada pueden subir fotos", 403);
    if (!allowed(device)) return fail("Demasiadas fotos en poco tiempo, inténtalo más tarde", 429);

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") return fail("Archivo no enviado", 400);
    const blob = file as Blob & { name?: string };
    if (!blob.type.startsWith("image/")) return fail("El archivo debe ser una imagen", 400);
    if (blob.size > 4 * 1024 * 1024) return fail("La imagen supera 4MB", 400);

    const body = new URLSearchParams();
    body.set("image", Buffer.from(await blob.arrayBuffer()).toString("base64"));
    body.set("name", "resena");

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: "POST", body });
    const text = await res.text();
    let json: { data?: { url?: string; delete_url?: string }; error?: { message?: string } } = {};
    try {
      json = JSON.parse(text);
    } catch {
      return fail(`ImgBB respondió con un error (${res.status})`, 502);
    }
    if (!res.ok || !json.data?.url) return fail(json.error?.message ?? `ImgBB rechazó la imagen (${res.status})`, 502);

    // Se guarda en privado el enlace de borrado (para poder eliminarla si la reseña se rechaza o se borra).
    if (json.data.delete_url) {
      const { error: regErr } = await sb.rpc("register_review_image", {
        p_device: device,
        p_url: json.data.url,
        p_delete_url: json.data.delete_url,
      });
      if (regErr) console.warn("[review-upload] No se guardó el enlace de borrado:", regErr.message);
    }

    return NextResponse.json({ url: json.data.url });
  } catch (err) {
    console.error("[review-upload] Error inesperado:", err);
    return fail("Error interno al subir la imagen", 500);
  }
}