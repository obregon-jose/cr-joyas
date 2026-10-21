/** "Anillo Esmeralda Real" → "anillo-esmeralda-real" (sin tildes ni símbolos). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const SEP = "--";

/** Ruta de la ficha: /producto/anillo-esmeralda--<id>. El nombre es solo para que el enlace se lea bien; manda el id. */
export function productPath(p: { id: string; name: string }): string {
  const slug = slugify(p.name);
  return `/producto/${slug ? slug + SEP : ""}${encodeURIComponent(p.id)}`;
}

/** Saca el id del final de la ruta (acepta también solo el id). */
export function idFromSlug(slug: string): string {
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch {}
  const i = decoded.lastIndexOf(SEP);
  return i >= 0 ? decoded.slice(i + SEP.length) : decoded;
}

/** Dirección pública del sitio (para enlaces absolutos, sitemap y redes sociales). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}