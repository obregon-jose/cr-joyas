import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ProductPage from "@/components/catalog/ProductPage";
import { getBrandName, getProduct, getVisibleProducts } from "@/lib/catalog/server-products";
import { finalPrice, onSale } from "@/lib/catalog/promo";
import { idFromSlug, productPath, siteUrl } from "@/lib/catalog/product-url";
import { getImages } from "@/lib/catalog/images";

// Se regenera cada minuto; el precio y el stock se vuelven a leer en el navegador al abrir la ficha.
export const revalidate = 60;
export const dynamicParams = true; // las piezas nuevas se generan la primera vez que alguien las abre

// Las fichas de todas las piezas se preparan de antemano (en la compilación): al abrirlas ya están listas.
export async function generateStaticParams() {
  try {
    const list = await getVisibleProducts();
    return list.map((p) => ({ slug: decodeURIComponent(productPath(p).replace("/producto/", "")) }));
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ slug: string }> };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
  const [product, brand] = await Promise.all([getProduct(idFromSlug(slug)), getBrandName()]);
  if (!product) return { title: "Pieza no encontrada", robots: { index: false } };
  const description = clip(product.description?.replace(/\s+/g, " ").trim() || `${product.name} · ${product.category} en ${product.material || "oro 18k"}.`, 160);
  const images = getImages(product).slice(0, 3);
  return {
    title: `${product.name} · ${brand}`,
    description,
    alternates: { canonical: productPath(product) },
    openGraph: { title: product.name, description, type: "website", siteName: brand, images },
    twitter: { card: "summary_large_image", title: product.name, description, images: images.slice(0, 1) },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(idFromSlug(slug));
  if (!product) notFound();

  // Si el producto cambió de nombre, el enlace viejo sigue funcionando y lleva al nuevo.
  const canonical = productPath(product);
  if (decodeURIComponent(slug) !== decodeURIComponent(canonical.replace("/producto/", ""))) permanentRedirect(canonical);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: getImages(product),
    category: product.category,
    material: product.material || undefined,
    url: `${siteUrl()}${canonical}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "COP",
      price: finalPrice(product),
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      ...(onSale(product) && product.promo_end ? { priceValidUntil: product.promo_end.slice(0, 10) } : {}),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductPage initial={product} />
    </>
  );
}