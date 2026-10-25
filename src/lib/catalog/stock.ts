import { Product } from "@/lib/types";

/** Tope de unidades por pieza en un solo pedido (el servidor también lo exige). */
export const MAX_PER_LINE = 50;

type StockFields = Pick<Product, "stock"> & { unlimited_stock?: boolean | null };

/** Pieza con stock ilimitado (por encargo o siempre disponible). */
export const isUnlimited = (p: StockFields) => p.unlimited_stock === true;

/** Agotada: solo las piezas con stock limitado pueden agotarse. */
export const isSoldOut = (p: StockFields) => !isUnlimited(p) && p.stock <= 0;

/** Unidades que se pueden pedir de esta pieza en total (sin contar lo que ya hay en el carrito). */
export const maxUnits = (p: StockFields) => (isUnlimited(p) ? MAX_PER_LINE : Math.min(MAX_PER_LINE, Math.max(0, p.stock)));

/** Pocas unidades: se muestra "¡Quedan solo N!". Nunca en piezas ilimitadas. */
export const isLow = (p: StockFields) => !isUnlimited(p) && p.stock > 0 && p.stock <= 3;