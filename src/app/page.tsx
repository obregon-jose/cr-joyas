"use client";

import { useEffect, useState } from "react";
import Loading from "@/components/sections/Loading";
import CursorGlow from "@/components/layout/CursorGlow";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Collections from "@/components/sections/Collections";
import ProductGrid from "@/components/catalog/ProductGrid";
import Atelier from "@/components/sections/Atelier";
import Testimonials from "@/components/reviews/Testimonials";
import CartDrawer from "@/components/cart/CartDrawer";
import WhatsAppFab from "@/components/layout/WhatsAppFab";
import FloatingCart from "@/components/cart/FloatingCart";
import Faq from "@/components/sections/Faq";
import Contact from "@/components/sections/Contact";
import Footer from "@/components/layout/Footer";

export default function Home() {
  const [category, setCategory] = useState("Todas");

  // Enlace desde la ficha de un producto: /?categoria=Anillos#catalogo abre el catálogo con ese filtro.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("categoria");
    if (!wanted) return;
    setCategory(wanted);
    window.history.replaceState(null, "", "/#catalogo"); // limpia la dirección para que al recargar no se vuelva a aplicar
    setTimeout(
      () =>
        document
          .getElementById("catalogo")
          ?.scrollIntoView({ behavior: "smooth" }),
      600,
    );
  }, []);

  return (
    <main className="relative">
      <Loading />
      <CursorGlow />
      <Navbar />
      <Hero />
      <Marquee />
      <Collections onPick={setCategory} />
      <ProductGrid category={category} setCategory={setCategory} />
      <Atelier />
      <Testimonials />
      <Faq />
      <Contact />
      <Footer />
      <CartDrawer />
      <WhatsAppFab />
      <FloatingCart />
    </main>
  );
}
