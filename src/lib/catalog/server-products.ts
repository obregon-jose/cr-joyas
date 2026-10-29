import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { demoProducts } from "@/lib/demo-data";
import { getImages } from "@/lib/catalog/images";
import { normalizeProduct, withVariantsFallback } from "@/lib/catalog/variants";
import { Product } from "@/lib/types";

const FALLBACK_BRAND = "CR Joyas"; // igual que el valor por defecto de Configuración

const withImages = (p: Product): Product => ({ ...p, images: getImages(p) });

/** Producto visible (no pausado) o null. Sin Supabase configurado usa los de ejemplo. */
// cache() de React: generateMetadata y la página piden el mismo producto y solo se consulta una vez por visita.
export const getProduct = cache(async (id: string): Promise<Product | null> => {
  if (!supabase) return demoProducts.find((p) => p.id === id) ?? null;
  const { data, error } = await withVariantsFallback((cols) =>
    supabase!.from("products").select(cols).eq("id", id).abortSignal(AbortSignal.timeout(5000)).maybeSingle()
  );
  // Si la consulta falla se lanza el error (en vez de decir "no existe"): así una caída pasajera no se guarda como 404.
  if (error) throw new Error(`No se pudo leer el producto: ${error.message}`);
  if (!data) return demoProducts.find((p) => p.id === id) ?? null;
  const p = normalizeProduct(data);
  return p.active === false ? null : p;
});

/** Todos los productos visibles (para el sitemap). */
export async function getVisibleProducts(): Promise<Product[]> {
  if (!supabase) return demoProducts;
  const { data, error } = await withVariantsFallback((cols) =>
    supabase!.from("products").select(cols).order("created_at", { ascending: false }).abortSignal(AbortSignal.timeout(5000))
  );
  const list = ((data as unknown[] | null) ?? []).map((p) => normalizeProduct(p)).filter((p) => p.active !== false);
  return error || list.length === 0 ? demoProducts : list;
}

// Configuración guardada (una sola consulta por visita).
const getStoredSettings = cache(async (): Promise<Record<string, unknown>> => {
  if (!supabase) return {};
  try {
    const { data } = await supabase.from("site_settings").select("data").eq("id", 1).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
    return (data?.data as Record<string, unknown> | undefined) ?? {};
  } catch {
    return {};
  }
});

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Nombre de la marca guardado en Configuración. */
export const getBrandName = cache(async (): Promise<string> => text((await getStoredSettings()).brand_name) || FALLBACK_BRAND);

const FALLBACK_DESCRIPTION =
  "Anillos, collares, aretes y pulseras en oro 18k, diamantes y esmeraldas colombianas. Piezas únicas hechas a mano.";

/** Título, descripción e imagen del sitio para Google y para compartir el enlace. */
export const getSiteSeo = cache(async () => {
  const s = await getStoredSettings();
  const brand = text(s.brand_name) || FALLBACK_BRAND;
  return {
    brand,
    title: text(s.seo_title) || `${brand} · Alta joyería colombiana`,
    description: text(s.seo_description) || FALLBACK_DESCRIPTION,
    image: text(s.hero_image),
  };
});