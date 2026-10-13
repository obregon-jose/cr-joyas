"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Check, ChevronDown } from "lucide-react";
import { SORT_LABELS, SortKey } from "@/lib/filters";

type Props = {
  value: SortKey;
  onChange: (v: SortKey) => void;
};

// Menú de orden propio (la lista nativa del navegador no se lee bien sobre fondo oscuro).
export default function SortMenu({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al tocar fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-11 items-center gap-2 rounded-full border bg-ink-900 pl-4 pr-3 text-xs text-white/80 transition hover:border-gold-400/50 ${
          open ? "border-gold-400" : "border-white/10"
        }`}
      >
        <ArrowUpDown className="h-4 w-4 text-gold-300" />
        <span className="max-w-[9.5rem] truncate">{SORT_LABELS[value]}</span>
        <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-30 mt-2 w-60 origin-top-right overflow-hidden rounded-2xl border border-gold-400/25 bg-ink-900 p-1.5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)]"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <li key={k} role="option" aria-selected={k === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(k);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition ${
                    k === value ? "bg-gold-400/10 text-gold-200" : "text-white/75 hover:bg-white/5"
                  }`}
                >
                  {SORT_LABELS[k]}
                  {k === value && <Check className="h-4 w-4 text-gold-300" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}