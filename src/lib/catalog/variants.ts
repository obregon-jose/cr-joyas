import { CartItem, Product, Variant } from "@/lib/types";
import { finalPrice } from "@/lib/catalog/promo";
import { getImages } from "@/lib/catalog/images";

/** Consulta de productos con sus opciones. Si la migración 019 aún no existe se usa la consulta de antes. */
export const PRODUCT_SELECT = "*, product_variants(*)";

/** Convierte una fila de la base de datos en un Product con sus opciones activas ordenadas en `variants`. */
export function normalizeProduct(raw: unknown, opts: { keepInactive?: boolean } = {}): Product {
  const { product_variants, ...rest } = raw as Product & { product_variants?: Variant[] | null };
  const list = Array.isArray(product_variants) ? product_variants : [];
  const variants = list
    .filter((v) => opts.keepInactive || v.active !== false)
    .map((v) => ({ ...v, images: Array.isArray(v.images) ? v.images.filter(Boolean) : [], stock: Number(v.stock) || 0, price: v.price == null ? null : Number(v.price) }))
    .sort((a, b) => a.position - b.position);
  return { ...(rest as Product), images: getImages(rest as Product), variants };
}

/** ¿El error es porque la relación product_variants aún no existe (migración 019 sin ejecutar)? */
export const isMissingVariants = (error: { message?: string; code?: string } | null | undefined) =>
  Boolean(error && (error.code === "PGRST200" || error.code === "42P01" || /product_variants|relationship/i.test(error.message ?? "")));

export const findVariant = (p: Pick<Product, "variants">, id?: string | null): Variant | null =>
  (id && p.variants?.find((v) => v.id === id)) || null;

/** Fotos a mostrar: primero las de la opción y después las generales del producto (portada, etc.), sin repetir. Sin opción: las del producto. */
export const variantImages = (p: Product, v?: Variant | null): string[] => {
  const general = getImages(p);
  if (!v || v.images.length === 0) return general;
  return [...v.images, ...general.filter((g) => !v.images.includes(g))];
};

/** Todas las fotos: las generales del producto y después las de cada opción, sin repetir. La galería no cambia al elegir opción: solo se enfoca la foto de esa opción. */
export const allImages = (p: Product): string[] => {
  const out = [...getImages(p)];
  for (const v of p.variants ?? []) for (const src of v.images) if (!out.includes(src)) out.push(src);
  return out;
};

/** Foto que se enfoca al elegir una opción (su primera foto propia), o null si no tiene. */
export const focusImage = (v?: Variant | null): string | null => v?.images?.[0] ?? null;

/** Precio de lista de la opción (el propio, o el del producto). */
export const listPrice = (p: Product, v?: Variant | null) => (v && v.price != null ? v.price : p.price);

/** Precio final (con la promoción del producto aplicada sobre el precio de la opción). */
export const priceOf = (p: Product, v?: Variant | null) => finalPrice({ ...p, price: listPrice(p, v) });

/** Precio más bajo entre las opciones disponibles (si todas están agotadas, entre todas). Sin opciones: el del producto. */
export function fromPrice(p: Product): number {
  const vs = p.variants ?? [];
  if (vs.length === 0) return finalPrice(p);
  const live = vs.filter((v) => v.unlimited_stock || v.stock > 0);
  return Math.min(...(live.length ? live : vs).map((v) => priceOf(p, v)));
}

/** ¿Las opciones tienen precios finales distintos? (entonces la tarjeta muestra "Desde $X") */
export const hasPriceRange = (p: Product) => {
  const vs = p.variants ?? [];
  return vs.length > 1 && new Set(vs.map((v) => priceOf(p, v))).size > 1;
};

/** Clave de una línea del carrito: producto + opción. */
export const lineKey = (i: Pick<CartItem, "product" | "variant_id">) => `${i.product.id}:${i.variant_id ?? ""}`;

type QueryResult = { data: unknown; error: { message?: string; code?: string } | null };

/** Ejecuta una consulta de productos pidiendo también sus opciones; si la migración 019 no está, repite sin ellas. */
export async function withVariantsFallback(run: (columns: string) => PromiseLike<QueryResult>): Promise<QueryResult> {
  const first = await run(PRODUCT_SELECT);
  return isMissingVariants(first.error) ? run("*") : first;
}