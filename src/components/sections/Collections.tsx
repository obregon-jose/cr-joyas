"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { Collection, useCollections } from "@/lib/catalog/use-collections";

const MAX_VISIBLE = 4;
const ROTATE_MS = 10000;

type Size = "big" | "wide" | "small";

// Misma composición en celular y en computador; cambia según cuántas colecciones se muestren (1 a 4).
const LAYOUTS: { span: string; size: Size }[][] = [
  [],
  [{ span: "col-span-4 row-span-2", size: "big" }],
  [
    { span: "col-span-2 row-span-2", size: "big" },
    { span: "col-span-2 row-span-2", size: "big" },
  ],
  [
    { span: "col-span-2 row-span-2", size: "big" },
    { span: "col-span-2 row-span-1", size: "wide" },
    { span: "col-span-2 row-span-1", size: "wide" },
  ],
  [
    { span: "col-span-2 row-span-2", size: "big" },
    { span: "col-span-2 row-span-1", size: "wide" },
    { span: "col-span-1 row-span-1", size: "small" },
    { span: "col-span-1 row-span-1", size: "small" },
  ],
];

// Tamaños de texto y botón según el tamaño del recuadro, para que nada se corte en pantallas pequeñas.
const STYLE: Record<Size, { pad: string; tag: string; name: string; arrow: string; icon: string }> = {
  big: {
    pad: "p-3 sm:p-5 md:p-8",
    tag: "mb-1 text-[8px] tracking-[0.18em] sm:mb-2 sm:text-[10px] md:text-xs md:tracking-[0.3em]",
    name: "text-2xl sm:text-4xl md:text-5xl",
    arrow: "h-8 w-8 sm:h-11 sm:w-11 md:h-14 md:w-14",
    icon: "h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6",
  },
  wide: {
    pad: "p-3 sm:p-5 md:p-8",
    tag: "mb-0.5 text-[8px] tracking-[0.18em] sm:mb-2 sm:text-[10px] md:text-xs md:tracking-[0.3em]",
    name: "text-lg sm:text-3xl md:text-5xl",
    arrow: "h-7 w-7 sm:h-11 sm:w-11 md:h-14 md:w-14",
    icon: "h-3.5 w-3.5 sm:h-5 sm:w-5 md:h-6 md:w-6",
  },
  small: {
    pad: "p-2 sm:p-4 lg:p-6",
    tag: "hidden lg:mb-2 lg:block lg:text-xs lg:tracking-[0.3em]",
    name: "text-[12px] leading-tight sm:text-xl lg:text-3xl xl:text-4xl",
    arrow: "h-6 w-6 sm:h-9 sm:w-9 lg:h-12 lg:w-12",
    icon: "h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5",
  },
};


// Baraja TODOS los recuadros: cada uno recibe una colección distinta a la que tenía.
// Si hay más de 4, entran colecciones de la cola (hasta 4) y las que salen se van al final de la cola.
function reshuffle(cur: { slots: string[]; queue: string[] }) {
  const n = cur.slots.length;
  if (n < 2) return cur;
  const k = Math.min(n, cur.queue.length);
  const order = [...cur.slots.keys()].sort(() => Math.random() - 0.5);
  const leaving = new Set(order.slice(0, k)); // recuadros cuya colección sale
  const incoming = cur.queue.slice(0, k);
  const stayers = cur.slots.filter((_, i) => !leaving.has(i));
  const pool = [...incoming, ...stayers];

  let result: string[] | null = null;
  for (let t = 0; t < 200 && !result; t++) {
    const p = [...pool].sort(() => Math.random() - 0.5);
    if (p.every((id, i) => id !== cur.slots[i])) result = p;
  }
  if (!result) result = [...cur.slots.slice(1), cur.slots[0]]; // respaldo: rotación simple
  return { slots: result, queue: [...cur.queue.slice(k), ...cur.slots.filter((_, i) => leaving.has(i))] };
}

export default function Collections({ onPick }: { onPick: (c: string) => void }) {
  const all = useCollections();
  const shownCount = Math.min(MAX_VISIBLE, all.length);

  // Los recuadros son fijos; lo que se mueve son las colecciones.
  // slots[i] = colección que está en el recuadro i; queue = las que esperan turno (cuando hay más de 4).
  const ids = useMemo(() => all.map((c) => c.id), [all]);
  const initial = useMemo(() => ({ slots: ids.slice(0, shownCount), queue: ids.slice(shownCount) }), [ids, shownCount]);
  const [state, setState] = useState(initial);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setState(initial);
    setTick(0);
  }, [initial]);

  // La rotación corre siempre (es un desvanecido suave, sin movimiento), aunque el sistema tenga "reducir animaciones".
  useEffect(() => {
    if (all.length < 2) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [all.length]);

  // Precarga (y decodifica) todas las imágenes: así, cuando una colección entra, ya está lista y no hay parpadeo.
  useEffect(() => {
    all.forEach((c) => {
      if (!c.img) return;
      const im = new Image();
      im.src = c.img;
      im.decode?.().catch(() => {});
    });
  }, [all]);

  useEffect(() => {
    if (tick === 0) return;
    setState((cur) => reshuffle(cur));
  }, [tick]);

  const byId = useMemo(() => new Map(all.map((c) => [c.id, c])), [all]);
  const visible = state.slots.map((id) => byId.get(id)).filter((c): c is Collection => Boolean(c));
  const layout = LAYOUTS[Math.min(visible.length, MAX_VISIBLE)] ?? [];

  if (visible.length === 0) return null;

  return (
    <section id="colecciones" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-28">
      <Reveal className="mb-12 text-center sm:mb-16">
        <p className="eyebrow mb-4">Colecciones</p>
        <h2 className="section-title">
          Una esencia,  <span className="gold-text italic">infinitas posibilidades.</span>
        </h2>
      </Reveal>

      {/* En celular el conjunto es un cuadrado perfecto: así el recuadro de arriba a la derecha (2 columnas × 1 fila) también es cuadrado. */}
      <div className="grid aspect-square grid-cols-4 grid-rows-2 gap-2 sm:aspect-auto sm:h-[620px] sm:gap-4 md:h-[780px]">
        {visible.map((c, i) => {
          const slot = layout[i];
          const s = STYLE[slot.size];
          return (
            <div key={i} className={`${slot.span} relative overflow-hidden rounded-2xl sm:rounded-3xl`}>
              <AnimatePresence initial={false}>
                <motion.a
                  key={c.id}
                  href="#catalogo"
                  onClick={() => onPick(c.name)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                  whileHover="hover"
                  className="group absolute inset-0 block overflow-hidden rounded-2xl sm:rounded-3xl"
                >
                  <motion.div variants={{ hover: { scale: 1.06 } }} initial={{ scale: 1 }} transition={{ duration: 1.2 }} className="absolute inset-0">
                    <SafeImage src={c.img} alt={c.name} className="h-full w-full object-cover" />
                  </motion.div>

                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent opacity-90" />
                  <div className="absolute inset-0 rounded-2xl border border-gold-400/0 transition-colors duration-500 group-hover:border-gold-400/60 sm:rounded-3xl" />

                  <div className={`absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 sm:gap-3 ${s.pad}`}>
                    <div className="min-w-0">
                      {c.tag && <p className={`line-clamp-2 uppercase text-gold-300 sm:line-clamp-1 ${s.tag}`}>{c.tag}</p>}
                      <h3 className={`font-serif ${s.name}`}>{c.name}</h3>
                    </div>
                    <motion.span
                      variants={{ hover: { rotate: 45, scale: 1.15 } }}
                      className={`flex shrink-0 items-center justify-center rounded-full bg-gold-300 text-ink-950 ${s.arrow}`}
                    >
                      <ArrowUpRight className={s.icon} />
                    </motion.span>
                  </div>
                </motion.a>
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}