"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useInView } from "framer-motion";
import { Loader2, SlidersHorizontal, X } from "lucide-react";
import Reveal from "./Reveal";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import FilterPanel from "./FilterPanel";
import SortMenu from "./SortMenu1"; 
import { useProducts } from "@/lib/use-products";
import { useCategories } from "@/lib/use-categories";
import { PAGE_SIZE, useInfiniteReveal } from "@/lib/use-infinite-reveal";
import { Product } from "@/lib/types";
import {
  Filters,
  applyFilters,
  countActive,
  defaultFilters,
  getBounds,
  materialOptions,
} from "@/lib/filters";
import { formatCOP } from "@/lib/format";


type Props = { category: string; setCategory: (c: string) => void };

function Skeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-ink-800 sm:rounded-3xl">
      <div className="aspect-[4/5] animate-pulse bg-gradient-to-br from-ink-700 to-ink-800" />
      <div className="space-y-2 p-3 sm:space-y-3 sm:p-5">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  );
}

export default function ProductGrid({ category, setCategory }: Props) {
  const { products, loading } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);
  const { order, hidden } = useCategories();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [panelOpen, setPanelOpen] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const sectionInView = useInView(sectionRef, { amount: 0.05 });
  const toolbarInView = useInView(toolbarRef);

  // Los productos de categorías ocultas no se muestran.
  const shown = useMemo(() => products.filter((p) => !hidden.includes(p.category)), [products, hidden]);

  // Filtros de categoría en el orden definido en el panel; solo las que tienen productos.
  const categories = useMemo(() => {
    const present = Array.from(new Set(shown.map((p) => p.category)));
    const sorted = [...order.filter((c) => present.includes(c)), ...present.filter((c) => !order.includes(c))];
    return ["Todas", ...sorted];
  }, [shown, order]);

  const bounds = useMemo(() => getBounds(shown), [shown]);
  const materials = useMemo(() => materialOptions(shown), [shown]);

  const byCategory = useMemo(
    () => (category === "Todas" ? shown : shown.filter((p) => p.category === category)),
    [shown, category]
  );
  const filtered = useMemo(() => applyFilters(byCategory, filters), [byCategory, filters]);

  // Carga progresiva: 12 piezas al inicio y 12 más cada vez que te acercas al final.
  const { visible, hasMore, loadingMore, sentinelRef } = useInfiniteReveal(
    filtered.length,
    JSON.stringify([category, filters])
  );
  const visibleProducts = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const activeCount = countActive(filters) + (category !== "Todas" ? 1 : 0);

  const clearAll = () => {
    setFilters((f) => ({ ...defaultFilters(), sort: f.sort }));
    setCategory("Todas");
  };

  // Etiquetas de los filtros activos, cada una con su botón para quitarla.
  const chips = useMemo(() => {
    const list: { key: string; label: string; remove: () => void }[] = [];
    if (category !== "Todas") list.push({ key: "cat", label: category, remove: () => setCategory("Todas") });
    if (filters.minPrice !== null || filters.maxPrice !== null) {
      const lo = filters.minPrice ?? bounds.min;
      const hi = filters.maxPrice ?? bounds.max;
      const label =
        filters.minPrice === null
          ? `Hasta ${formatCOP(hi)}`
          : filters.maxPrice === null
            ? `Desde ${formatCOP(lo)}`
            : `${formatCOP(lo)} – ${formatCOP(hi)}`;
      list.push({ key: "price", label, remove: () => setFilters((f) => ({ ...f, minPrice: null, maxPrice: null })) });
    }
    filters.materials.forEach((m) =>
      list.push({
        key: `m-${m}`,
        label: m,
        remove: () => setFilters((f) => ({ ...f, materials: f.materials.filter((x) => x !== m) })),
      })
    );
    if (filters.onlyAvailable)
      list.push({ key: "av", label: "Solo disponibles", remove: () => setFilters((f) => ({ ...f, onlyAvailable: false })) });
    if (filters.onlyFeatured)
      list.push({ key: "ft", label: "Destacados", remove: () => setFilters((f) => ({ ...f, onlyFeatured: false })) });
    return list;
  }, [category, filters, bounds, setCategory]);

  return (
    <section id="catalogo" ref={sectionRef} className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28">
      <Reveal className="mb-10 text-center sm:mb-12">
        <p className="eyebrow mb-4">Catálogo</p>
        <h2 className="section-title">
          Piezas que <span className="gold-text italic">perduran</span>
        </h2>
      </Reveal>

      <LayoutGroup>
        <div ref={toolbarRef} className="mb-6 space-y-4 sm:mb-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPanelOpen(true)}
              className="flex h-11 items-center gap-2 rounded-full border border-gold-400/40 bg-ink-900 px-5 text-[11px] font-medium uppercase tracking-[0.18em] text-gold-100 transition hover:border-gold-300 hover:bg-gold-400/10"
            >
              <SlidersHorizontal className="h-4 w-4 text-gold-300" />
              Filtros
              {activeCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-300 px-1 text-[10px] font-bold text-ink-950">
                  {activeCount}
                </span>
              )}
            </button>

            <SortMenu value={filters.sort} onChange={(sort) => setFilters((f) => ({ ...f, sort }))} />
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <button
                  key={c.key}
                  onClick={c.remove}
                  className="flex items-center gap-1.5 rounded-full border border-gold-400/30 bg-gold-400/10 py-1.5 pl-3 pr-2 text-[11px] text-gold-100 transition hover:border-gold-300"
                >
                  {c.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button onClick={clearAll} className="px-2 text-[11px] uppercase tracking-widest text-white/50 underline-offset-4 hover:text-gold-200 hover:underline">
                Limpiar todo
              </button>
            </div>
          )}

          {!loading && (
            <p className="text-xs text-white/40">
              {filtered.length} {filtered.length === 1 ? "pieza" : "piezas"}
            </p>
          )}
        </div>

        <motion.div layout className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
          ) : (
            <AnimatePresence mode="popLayout">
              {visibleProducts.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={setSelected} />
              ))}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Al acercarte a este punto se revelan las siguientes piezas */}
        <div ref={sentinelRef} aria-hidden className="h-px" />
        {!loading && loadingMore && (
          <div className="flex items-center justify-center gap-3 py-10 text-xs uppercase tracking-[0.25em] text-gold-300/80">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando más piezas
          </div>
        )}
        {!loading && !hasMore && filtered.length > PAGE_SIZE && (
          <p className="py-10 text-center text-xs uppercase tracking-[0.25em] text-white/30">Has visto todas las piezas</p>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-serif text-2xl text-white/70">No encontramos piezas con esos filtros</p>
            <button onClick={clearAll} className="btn-ghost mt-6">
              Limpiar filtros
            </button>
          </div>
        )}
      </LayoutGroup>

      {/* Botón flotante de filtros (solo celular, cuando la barra superior ya no se ve) */}
      <AnimatePresence>
        {sectionInView && !toolbarInView && !panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center md:hidden"
          >
            <button
              onClick={() => setPanelOpen(true)}
              className="pointer-events-auto flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-200 px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-ink-950 shadow-[0_10px_40px_-8px_rgba(217,174,58,0.6)]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filtros{activeCount > 0 ? ` · ${activeCount}` : ""}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <FilterPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        filters={filters}
        onChange={setFilters}
        bounds={bounds}
        categories={categories}
        category={category}
        setCategory={setCategory}
        materials={materials}
        resultCount={filtered.length}
        onClear={clearAll}
      />

      <ProductModal product={selected} onClose={() => setSelected(null)} />
    </section>
  );
}