"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Reveal from "./Reveal";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import { useProducts } from "@/lib/use-products";
import { Product } from "@/lib/types";

type Props = { category: string; setCategory: (c: string) => void };

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/5 bg-ink-800">
      <div className="aspect-[4/5] animate-pulse bg-gradient-to-br from-ink-700 to-ink-800" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

export default function ProductGrid({ category, setCategory }: Props) {
  const { products, loading } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );
  const filtered = useMemo(
    () => (category === "Todas" ? products : products.filter((p) => p.category === category)),
    [products, category]
  );

  return (
    <section id="catalogo" className="relative mx-auto max-w-7xl px-6 py-28">
      <Reveal className="mb-12 text-center">
        <p className="eyebrow mb-4">Catálogo</p>
        <h2 className="section-title">
          Piezas que <span className="gold-text italic">perduran</span>
        </h2>
      </Reveal>

      <LayoutGroup>
        <div className="mb-14 flex flex-wrap justify-center gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`relative rounded-full px-6 py-2.5 text-xs font-medium uppercase tracking-[0.2em] transition-colors ${
                category === c ? "text-ink-950" : "text-white/60 hover:text-gold-200"
              }`}
            >
              {category === c && (
                <motion.span
                  layoutId="filter-pill"
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-400 to-gold-200"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{c}</span>
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
          ) : (
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={setSelected} />
              ))}
            </AnimatePresence>
          )}
        </motion.div>
      </LayoutGroup>

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
