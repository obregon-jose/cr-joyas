import type { MetadataRoute } from "next";
import { getVisibleProducts } from "@/lib/catalog/server-products";
import { productPath, siteUrl } from "@/lib/catalog/product-url";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getVisibleProducts();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    ...products.map((p) => ({
      url: `${base}${productPath(p)}`,
      lastModified: p.created_at ? new Date(p.created_at) : undefined,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}