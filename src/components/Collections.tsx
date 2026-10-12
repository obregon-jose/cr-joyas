"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Reveal from "./Reveal";
import SafeImage from "./SafeImage";

const collections = [
  {
    id: "anillos",
    name: "Anillos",
    tag: "Compromiso & Eternidad",
    img: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1000&q=80",
  },
  {
    id: "collares",
    name: "Collares",
    tag: "Elegancia en el cuello",
    img: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1000&q=80",
  },
  {
    id: "aretes",
    name: "Aretes",
    tag: "Luz en cada gesto",
    img: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1000&q=80",
  },
  {
    id: "pulseras",
    name: "Pulseras",
    tag: "Detalles que enamoran",
    img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1000&q=80",
  },
];

const positionClasses = [
  "md:col-span-2 md:row-span-2",
  "md:col-span-2 md:row-span-1",
  "md:col-span-1 md:row-span-1",
  "md:col-span-1 md:row-span-1",
];

export default function Collections({
  onPick,
}: {
  onPick: (c: string) => void;
}) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRotation((current) => (current + 1) % collections.length);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const visibleCollections = collections.map((_, index) => {
    return collections[
      (index - rotation + collections.length) % collections.length
    ];
  });

  return (
    <section
      id="colecciones"
      className="mx-auto max-w-7xl px-6 py-28"
    >
      <Reveal className="mb-16 text-center">
        <p className="eyebrow mb-4">Colecciones</p>
        <h2 className="section-title">
          Cuatro mundos,{" "}
          <span className="gold-text italic">una esencia</span>
        </h2>
      </Reveal>

      <div className="grid gap-4 md:h-[780px] md:grid-cols-4 md:grid-rows-2">
        {visibleCollections.map((c, i) => (
          <div
            key={i}
            className={`${positionClasses[i]} relative min-h-[280px] overflow-hidden rounded-3xl`}
          >
            <AnimatePresence initial={false}>
              <motion.a
                key={c.id}
                href="#catalogo"
                onClick={() => onPick(c.name)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1, ease: "easeInOut" }}
                whileHover="hover"
                className="group absolute inset-0 block overflow-hidden rounded-3xl"
              >
                <motion.div
                  variants={{
                    hover: { scale: 1.06 },
                  }}
                  initial={{ scale: 1 }}
                  transition={{ duration: 1.2 }}
                  className="absolute inset-0"
                >
                  <SafeImage
                    src={c.img}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                </motion.div>

                <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent opacity-90" />

                <div className="absolute inset-0 rounded-3xl border border-gold-400/0 transition-colors duration-500 group-hover:border-gold-400/60" />

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 md:p-8">
                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-gold-300 md:text-xs md:tracking-[0.3em]">
                      {c.tag}
                    </p>
                    <h3 className="font-serif text-3xl md:text-5xl">
                      {c.name}
                    </h3>
                  </div>

                  <motion.span
                    variants={{
                      hover: { rotate: 45, scale: 1.15 },
                    }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-300 text-ink-950 md:h-14 md:w-14"
                  >
                    <ArrowUpRight className="h-5 w-5 md:h-6 md:w-6" />
                  </motion.span>
                </div>
              </motion.a>
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}