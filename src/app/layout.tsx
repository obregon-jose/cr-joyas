import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart/cart";
import Toaster from "@/components/ui/Toaster";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "CR Joyas · Alta joyería colombiana",
  description:
    "Anillos, collares, aretes y pulseras en oro 18k, diamantes y esmeraldas colombianas. Piezas únicas hechas a mano.",
};

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