import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart";
import Toaster from "@/components/ui/Toaster";
import { getSiteSeo } from "@/lib/catalog/server-products";

// El título y la descripción vienen de Configuración; se actualizan solos cada minuto.
export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSiteSeo();
  const images = seo.image ? [seo.image] : undefined;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: seo.title,
    description: seo.description,
    openGraph: { title: seo.title, description: seo.description, siteName: seo.brand, type: "website", locale: "es_CO", images },
    twitter: { card: images ? "summary_large_image" : "summary", title: seo.title, description: seo.description, images },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <CartProvider>{children}</CartProvider>
        <Toaster />
      </body>
    </html>
  );
}