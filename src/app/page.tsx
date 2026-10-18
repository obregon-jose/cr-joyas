"use client";

import { useState } from "react";
import Loading from "@/components/Loading";
import CursorGlow from "@/components/CursorGlow";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Collections from "@/components/Collections";
import ProductGrid from "@/components/ProductGrid";
import Atelier from "@/components/Atelier";
import Testimonials from "@/components/Testimonials";
import Contact, { Footer } from "@/components/Contact";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppFab from "@/components/WhatsAppFab";
import FloatingCart from "@/components/FloatingCart";
import Faq from "@/components/Faq";

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
