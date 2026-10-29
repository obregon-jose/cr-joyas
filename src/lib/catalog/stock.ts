import { Product } from "@/lib/types";

/** Tope de unidades por pieza en un solo pedido (el servidor también lo exige). */
export const MAX_PER_LINE = 50;

type StockFields = { stock: number; unlimited_stock?: boolean | null; variants?: StockFields[] | null };

/** El producto tiene opciones (colores, tallas...): el stock se lleva por opción. */
export const hasVariants = (p: Pick<Product, "variants">) => Boolean(p.variants && p.variants.length > 0);

/** Pieza (o variante) con stock ilimitado (por encargo o siempre disponible). */
export const isUnlimited = (p: StockFields) => p.unlimited_stock === true;

/** Agotada: un producto con opciones se agota solo cuando todas sus opciones se agotan. */
export const isSoldOut = (p: StockFields): boolean =>
  p.variants && p.variants.length > 0 ? p.variants.every(isSoldOut) : !isUnlimited(p) && p.stock <= 0;

/**
 * Unidades que se pueden pedir en total (sin contar lo que ya hay en el carrito).
 * Si el producto tiene opciones hay que indicar cuál; sin opción elegida no se puede pedir nada.
 */
export const maxUnits = (p: StockFields, variant?: StockFields | null): number => {
  if (p.variants && p.variants.length > 0) return variant ? maxUnits(variant) : 0;
  return isUnlimited(p) ? MAX_PER_LINE : Math.min(MAX_PER_LINE, Math.max(0, p.stock));
};

/** Pocas unidades: se muestra "¡Quedan solo N!". Nunca en piezas ilimitadas. */
export const isLow = (p: StockFields) => !isUnlimited(p) && p.stock > 0 && p.stock <= 3;