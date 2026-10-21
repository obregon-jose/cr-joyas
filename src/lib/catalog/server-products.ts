import { cache } from "react";
import { supabase } from "@/lib/supabase";
import { demoProducts } from "@/lib/demo-data";
import { getImages } from "@/lib/catalog/images";
import { Product } from "@/lib/types";

const FALLBACK_BRAND = "CR Joyas"; // igual que el valor por defecto de Configuración

const withImages = (p: Product): Product => ({ ...p, images: getImages(p) });

/** Producto visible (no pausado) o null. Sin Supabase configurado usa los de ejemplo. */
// cache() de React: generateMetadata y la página piden el mismo producto y solo se consulta una vez por visita.
export const getProduct = cache(async (id: string): Promise<Product | null> => {
  if (!supabase) return demoProducts.find((p) => p.id === id) ?? null;
  const { data, error } = await supabase.from("products").select("*").eq("id", id).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
  // Si la consulta falla se lanza el error (en vez de decir "no existe"): así una caída pasajera no se guarda como 404.
  if (error) throw new Error(`No se pudo leer el producto: ${error.message}`);
  if (!data) return demoProducts.find((p) => p.id === id) ?? null;
  const p = data as Product;
  return p.active === false ? null : withImages(p);
});

/** Todos los productos visibles (para el sitemap). */
export async function getVisibleProducts(): Promise<Product[]> {
  if (!supabase) return demoProducts;
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false })
    .abortSignal(AbortSignal.timeout(5000));
  const list = ((data as Product[] | null) ?? []).filter((p) => p.active !== false).map(withImages);
  return error || list.length === 0 ? demoProducts : list;
}

/** Nombre de la marca guardado en Configuración. */
export const getBrandName = cache(async (): Promise<string> => {
  if (!supabase) return FALLBACK_BRAND;
  const { data } = await supabase.from("site_settings").select("data").eq("id", 1).abortSignal(AbortSignal.timeout(5000)).maybeSingle();
  const name = (data?.data as { brand_name?: unknown } | undefined)?.brand_name;
  return typeof name === "string" && name.trim() ? name.trim() : FALLBACK_BRAND;
});