"use client";

import { useState } from "react";
import Loading from "@/components/sections/Loading";
import CursorGlow from "@/components/layout/CursorGlow";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/sections/Hero";
import Marquee from "@/components/sections/Marquee";
import Collections from "@/components/sections/Collections";
import ProductGrid from "@/components/catalog/ProductGrid";
import Atelier from "@/components/sections/Atelier";
import Testimonials from "@/components/reviews/Testimonials";
import Contact, { Footer } from "@/components/sections/Contact";
import CartDrawer from "@/components/cart/CartDrawer";
import WhatsAppFab from "@/components/layout/WhatsAppFab";
import FloatingCart from "@/components/cart/FloatingCart";
import Faq from "@/components/faq/Faq";

export default function Home() {
  const [category, setCategory] = useState("Todas");

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
