"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";

type Props = { images: string[]; alt: string };

const variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 60, scale: d === 0 ? 1.25 : 1 }),
  center: { opacity: 1, x: 0, scale: 1 },
  exit: (d: number) => ({ opacity: 0, x: d * -60 }),
};

/** Galería del modal: botones anterior/siguiente, miniaturas, flechas del teclado y deslizar en móvil. */
export default function ProductGallery({ images, alt }: Props) {
  const [[index, dir], setState] = useState<[number, number]>([0, 0]);
  const count = images.length;
  const multiple = count > 1;

  const go = useCallback(
    (step: number) => setState(([i]) => [(i + step + count) % count, step]),
    [count]
  );

  useEffect(() => {
    if (!multiple) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [multiple, go]);

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-ink-950/60 p-2.5 backdrop-blur transition hover:border-gold-300/60 hover:bg-ink-950 hover:text-gold-300";

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AnimatePresence initial={false} custom={dir} mode="popLayout">
        <motion.div
          key={index}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: dir === 0 ? 1.4 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          drag={multiple ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(1);
            else if (info.offset.x > 60) go(-1);
          }}
          className="absolute inset-0 touch-pan-y"
        >
          <SafeImage src={images[index]} alt={`${alt} · imagen ${index + 1}`} className="h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>

      {multiple && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Imagen anterior" className={`${arrow} left-3`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Imagen siguiente" className={`${arrow} right-3`}>
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-0 bottom-4 z-10 flex items-center justify-center gap-2">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setState([i, i > index ? 1 : -1])}
                aria-label={`Ver imagen ${i + 1}`}
                className={`h-12 w-12 overflow-hidden rounded-lg border-2 transition ${
                  i === index ? "border-gold-300" : "border-white/20 opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <span className="absolute left-4 top-4 z-10 rounded-full bg-ink-950/60 px-3 py-1 text-xs tracking-widest text-white/70 backdrop-blur">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}