import { Product } from "./types";

/** Lista de imágenes de un producto: la primera es la portada. */
export function getImages(p: Pick<Product, "images" | "image_url">): string[] {
  const list = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
  if (list.length > 0) return list;
  return p.image_url ? [p.image_url] : [];
}