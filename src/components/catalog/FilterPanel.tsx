"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { Filters, PRICE_STEP } from "@/lib/catalog/filters";
import { formatCOP } from "@/lib/format";

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  bounds: { min: number; max: number };
  categories: string[]; // incluye "Todas"
  category: string;
  setCategory: (c: string) => void;
  materials: string[];
  resultCount: number;
  onClear: () => void;
};

const chip = (on: boolean) =>
  `rounded-full border px-4 py-2 text-xs transition ${
    on ? "border-gold-300 bg-gold-300 font-semibold text-ink-950" : "border-white/10 text-white/70 hover:border-gold-400/50"
  }`;

const thumb =
  "pointer-events-none absolute inset-0 h-6 w-full appearance-none bg-transparent " +
  "[&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 " +
  "[&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full " +
  "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-950 [&::-webkit-slider-thumb]:bg-gold-300 " +
  "[&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 " +
  "[&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 " +
  "[&::-moz-range-thumb]:border-ink-950 [&::-moz-range-thumb]:bg-gold-300";

function PriceSlider({
  bounds,
  lo,
  hi,
  onChange,
}: {
  bounds: { min: number; max: number };
  lo: number;
  hi: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const span = bounds.max - bounds.min || 1;
  const left = ((lo - bounds.min) / span) * 100;
  const right = 100 - ((hi - bounds.min) / span) * 100;
  return (
    <div className="relative h-6">
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/10" />
      <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-gold-300" style={{ left: `${left}%`, right: `${right}%` }} />
      <input
        type="range"
        aria-label="Precio mínimo"
        min={bounds.min}
        max={bounds.max}
        step={PRICE_STEP}
        value={lo}
        onChange={(e) => onChange(Math.min(Number(e.target.value), hi - PRICE_STEP), hi)}
        className={thumb}
      />
      <input
        type="range"
        aria-label="Precio máximo"
        min={bounds.min}
        max={bounds.max}
        step={PRICE_STEP}
        value={hi}
        onChange={(e) => onChange(lo, Math.max(Number(e.target.value), lo + PRICE_STEP))}
        className={thumb}
      />
    </div>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 px-4 py-3 text-left transition hover:border-gold-400/40"
    >
      <span>
        <span className="block text-sm text-white">{label}</span>
        <span className="block text-xs text-white/40">{desc}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-gold-300" : "bg-white/15"}`}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={`absolute top-0.5 h-5 w-5 rounded-full ${on ? "right-0.5 bg-ink-950" : "left-0.5 bg-white"}`}
        />
      </span>
    </button>
  );
}

// Panel flotante de filtros: hoja inferior en celular y panel lateral en pantallas grandes.
export default function FilterPanel({
  open,
  onClose,
  filters,
  onChange,
  bounds,
  categories,
  category,
  setCategory,
  materials,
  resultCount,
  onClear,
}: Props) {
  const [desktop, setDesktop] = useState(false);
  const controls = useDragControls();

  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(m.matches);
    update();
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const lo = filters.minPrice ?? bounds.min;
  const hi = filters.maxPrice ?? bounds.max;
  const setRange = (a: number, b: number) =>
    onChange({ ...filters, minPrice: a <= bounds.min ? null : a, maxPrice: b >= bounds.max ? null : b });
  const toggleMaterial = (m: string) =>
    onChange({
      ...filters,
      materials: filters.materials.includes(m) ? filters.materials.filter((x) => x !== m) : [...filters.materials, m],
    });

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75]" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-label="Filtros"
            initial={desktop ? { x: "100%" } : { y: "100%" }}
            animate={{ x: 0, y: 0 }}
            exit={desktop ? { x: "100%" } : { y: "100%" }}
            transition={{ type: "spring", damping: 34, stiffness: 320 }}
            drag={desktop ? false : "y"}
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-3xl border-t border-gold-400/25 bg-ink-900 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-t-0"
          >
            {/* Agarradera para arrastrar hacia abajo (solo celular) */}
            <div
              className="flex cursor-grab justify-center pb-1 pt-3 md:hidden"
              onPointerDown={(e) => controls.start(e)}
              style={{ touchAction: "none" }}
            >
              <span className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <header className="flex items-center justify-between px-6 pb-2 pt-3 md:pt-6">
              <h2 className="font-serif text-3xl">Filtros</h2>
              <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-2 transition hover:rotate-90 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-8 overflow-y-auto px-6 py-5">
              <section>
                <h3 className="eyebrow mb-3">Categoría</h3>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </section>

              {bounds.max > bounds.min && (
                <section>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h3 className="eyebrow">Precio</h3>
                    <p className="text-sm text-gold-200">
                      {formatCOP(lo)} – {formatCOP(hi)}
                    </p>
                  </div>
                  <div className="px-3">
                    <PriceSlider bounds={bounds} lo={lo} hi={hi} onChange={setRange} />
                  </div>
                  <div className="mt-2 flex justify-between px-1 text-[11px] text-white/35">
                    <span>{formatCOP(bounds.min)}</span>
                    <span>{formatCOP(bounds.max)}</span>
                  </div>
                </section>
              )}

              {materials.length > 0 && (
                <section>
                  <h3 className="eyebrow mb-3">Material o piedra</h3>
                  <div className="flex flex-wrap gap-2">
                    {materials.map((m) => (
                      <button key={m} onClick={() => toggleMaterial(m)} className={chip(filters.materials.includes(m))}>
                        {m}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h3 className="eyebrow mb-3">Disponibilidad</h3>
                <Toggle
                  label="Solo disponibles"
                  desc="Oculta las piezas agotadas"
                  on={filters.onlyAvailable}
                  onChange={(v) => onChange({ ...filters, onlyAvailable: v })}
                />
                <Toggle
                  label="Solo destacados"
                  desc="Las piezas favoritas de la casa"
                  on={filters.onlyFeatured}
                  onChange={(v) => onChange({ ...filters, onlyFeatured: v })}
                />
                <Toggle
                  label="Solo en oferta"
                  desc="Piezas con descuento vigente"
                  on={filters.onlyOnSale}
                  onChange={(v) => onChange({ ...filters, onlyOnSale: v })}
                />
              </section>
            </div>

            <footer className="flex gap-3 border-t border-white/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={onClear} className="btn-ghost flex-1 !px-4 !py-3">
                Limpiar
              </button>
              <button onClick={onClose} className="btn-gold flex-[2] !px-4 !py-3">
                Ver {resultCount} {resultCount === 1 ? "pieza" : "piezas"}
              </button>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}