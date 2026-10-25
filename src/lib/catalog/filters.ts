import { Product } from "@/lib/types";
import { isSoldOut } from "@/lib/catalog/stock";
import { finalPrice, onSale } from "@/lib/catalog/promo";

export type SortKey = "relevance" | "favorites" | "newest" | "price_asc" | "price_desc" | "name";

export type Filters = {
  minPrice: number | null; // null = sin límite
  maxPrice: number | null;
  materials: string[]; // coincide con cualquiera de los seleccionados
  onlyAvailable: boolean;
  onlyFeatured: boolean;
  onlyOnSale: boolean;
  onlyFavorites: boolean; // los marcados con el corazón en este navegador
  sort: SortKey;
};

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Destacados",
  favorites: "Favoritas",
  newest: "Más recientes",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  name: "Nombre A–Z",
};

export const PRICE_STEP = 50000;

export const defaultFilters = (): Filters => ({
  minPrice: null,
  maxPrice: null,
  materials: [],
  onlyAvailable: false,
  onlyFeatured: false,
  onlyOnSale: false,
  onlyFavorites: false,
  sort: "relevance",
});

// Rango de precios disponible, redondeado al paso del slider.
export function getBounds(products: Product[]) {
  if (!products.length) return { min: 0, max: 0 };
  const prices = products.map((p) => finalPrice(p));
  const min = Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP;
  const max = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
  return { min, max: Math.max(max, min + PRICE_STEP) };
}

// "Oro 18k · Diamante" -> ["Oro 18k", "Diamante"]
export function splitMaterial(material: string | null | undefined): string[] {
  return (material ?? "")
    .split(/[·,/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// Materiales disponibles, los más usados primero.
export function materialOptions(products: Product[]): string[] {
  const count = new Map<string, number>();
  products.forEach((p) => splitMaterial(p.material).forEach((m) => count.set(m, (count.get(m) ?? 0) + 1)));
  return Array.from(count.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
    .map(([m]) => m);
}

export function countActive(f: Filters): number {
  return (
    (f.minPrice !== null || f.maxPrice !== null ? 1 : 0) +
    f.materials.length +
    (f.onlyAvailable ? 1 : 0) +
    (f.onlyFeatured ? 1 : 0) +
    (f.onlyOnSale ? 1 : 0) +
    (f.onlyFavorites ? 1 : 0)
  );
}

export function applyFilters(
  products: Product[],
  f: Filters,
  favorites: string[] = [],
  /** Orden de "Favoritas": normalmente son los mismos favoritos; el catálogo pasa una copia fija para que las piezas no salten al tocar el corazón. */
  favoriteOrder: string[] = favorites
): Product[] {
  const lo = f.minPrice ?? -Infinity;
  const hi = f.maxPrice ?? Infinity;

  const list = products.filter((p) => {
    const price = finalPrice(p);
    if (price < lo || price > hi) return false;
    if (f.onlyOnSale && !onSale(p)) return false;
    if (f.onlyFavorites && !favorites.includes(String(p.id))) return false;
    if (f.onlyAvailable && isSoldOut(p)) return false;
    if (f.onlyFeatured && !p.featured) return false;
    if (f.materials.length) {
      const own = splitMaterial(p.material);
      if (!f.materials.some((m) => own.includes(m))) return false;
    }
    return true;
  });

  const time = (p: Product) => (p.created_at ? new Date(p.created_at).getTime() : 0);
  switch (f.sort) {
    case "price_asc":
      return list.sort((a, b) => finalPrice(a) - finalPrice(b));
    case "price_desc":
      return list.sort((a, b) => finalPrice(b) - finalPrice(a));
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "newest":
      return list.sort((a, b) => time(b) - time(a));
    case "favorites":
      // Las favoritas primero; entre iguales se mantiene el orden de destacados.
      return list.sort(
        (a, b) =>
          Number(favoriteOrder.includes(String(b.id))) - Number(favoriteOrder.includes(String(a.id))) ||
          Number(b.featured) - Number(a.featured)
      );
    default:
      // Destacados primero y, entre iguales, se respeta el orden original.
      return list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}