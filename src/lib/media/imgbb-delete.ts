// Borrado de imágenes en ImgBB (solo servidor).
// ImgBB no tiene un endpoint oficial para borrar: lo que entrega al subir es un "delete_url", que es una página web.
// Por eso se prueban dos caminos, en orden, y se devuelve un detalle claro de lo que respondió cada uno:
//   1) DELETE al delete_url (lo que hacen varias librerías, por si ImgBB lo acepta);
//   2) el mismo flujo que usa el botón "Eliminar" de esa página: leer el token de la página y confirmar el borrado.

export type DeleteResult = { ok: boolean; via?: "api" | "web"; detail: string };

const UA = "Mozilla/5.0 (compatible; TiendaAdmin/1.0)";
const snip = (s: string) => s.replace(/\s+/g, " ").slice(0, 160);

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const j = JSON.parse(text);
    return j && typeof j === "object" ? (j as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const okBody = (j: Record<string, unknown> | null) => {
  if (!j) return false;
  if (j.status_code === 200) return true;
  const s = j.success as { code?: number } | undefined;
  if (s && s.code === 200) return true;
  return j.success === true;
};

async function viaApi(deleteUrl: string, apiKey: string): Promise<DeleteResult> {
  const target = new URL(deleteUrl);
  target.searchParams.set("key", apiKey);
  const res = await fetch(target, { method: "DELETE", headers: { "User-Agent": UA }, redirect: "manual" });
  const text = await res.text();
  const j = parseJson(text);
  if (res.status === 404 || res.status === 410) return { ok: true, via: "api", detail: "ya no existía" };
  if (res.ok && j && !j.error) return { ok: true, via: "api", detail: "borrada" };
  return { ok: false, detail: `DELETE ${res.status}: ${snip(text)}` };
}

async function viaWeb(deleteUrl: string): Promise<DeleteResult> {
  const u = new URL(deleteUrl);
  const [id, hash] = u.pathname.split("/").filter(Boolean);
  if (!id || !hash) return { ok: false, detail: "el enlace de borrado no tiene el formato esperado" };

  const page = await fetch(deleteUrl, { headers: { "User-Agent": UA, Accept: "text/html" } });
  const html = await page.text();
  if (page.status === 404 || page.status === 410) return { ok: true, via: "web", detail: "ya no existía" };
  if (!page.ok) return { ok: false, detail: `página de borrado ${page.status}` };

  const token =
    /auth_token["']?\s*[:=]\s*["']([A-Za-z0-9]{16,})["']/.exec(html)?.[1] ??
    /name=["']auth_token["'][^>]*value=["']([A-Za-z0-9]{16,})["']/.exec(html)?.[1];
  if (!token) return { ok: false, detail: "no se encontró el token en la página de ImgBB (¿cambió su sitio?)" };

  const headersAny = page.headers as unknown as { getSetCookie?: () => string[] };
  const cookies = (headersAny.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

  const body = new URLSearchParams();
  body.set("action", "delete");
  body.set("delete", "image");
  body.set("from", "resource");
  body.set("deleting[id]", id);
  body.set("deleting[hash]", hash);
  body.set("auth_token", token);

  const res = await fetch(`${u.origin}/json`, {
    method: "POST",
    body,
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Origin: u.origin,
      Referer: deleteUrl,
      "X-Requested-With": "XMLHttpRequest",
      ...(cookies ? { Cookie: cookies } : {}),
    },
  });
  const text = await res.text();
  const j = parseJson(text);
  if (okBody(j)) return { ok: true, via: "web", detail: "borrada" };
  return { ok: false, detail: `POST /json ${res.status}: ${snip(text)}` };
}

/** Intenta borrar una imagen. Nunca lanza error: devuelve qué pasó. */
export async function deleteFromImgbb(deleteUrl: string, apiKey: string): Promise<DeleteResult> {
  const notes: string[] = [];
  for (const attempt of [() => viaApi(deleteUrl, apiKey), () => viaWeb(deleteUrl)]) {
    try {
      const r = await attempt();
      if (r.ok) return r;
      notes.push(r.detail);
    } catch (e) {
      notes.push(e instanceof Error ? e.message : "error de red");
    }
  }
  return { ok: false, detail: notes.join(" · ") };
}