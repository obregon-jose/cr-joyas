"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import SafeImage from "./SafeImage";

type Props = { images: string[]; start: number; onClose: () => void } | null;

/** Visor de fotos de reseñas a pantalla completa (flechas, teclado y deslizar). */
export default function Lightbox({ data }: { data: Props }) {
  return <AnimatePresence>{data && <Viewer key="lb" {...data} />}</AnimatePresence>;
}

function Viewer({ images, start, onClose }: { images: string[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const many = images.length > 1;
  const go = useCallback((d: number) => setI((v) => (v + d + images.length) % images.length), [images.length]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (many && e.key === "ArrowRight") go(1);
      if (many && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [go, many, onClose]);

  const btn = "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-ink-950/60 p-3 backdrop-blur transition hover:border-gold-300/60 hover:text-gold-300";

  return (
    <motion.div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-ink-950/95 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-3 transition hover:rotate-90 hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      {many && (
        <>
          <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Foto anterior" className={`${btn} left-3`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Foto siguiente" className={`${btn} right-3`}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs tracking-widest text-white/70">
            {i + 1} / {images.length}
          </span>
        </>
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25 }}
          drag={many ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragEnd={(_, info) => {
            if (info.offset.x < -70) go(1);
            else if (info.offset.x > 70) go(-1);
          }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[88vh] max-w-5xl"
        >
          <SafeImage src={images[i]} alt={`Foto ${i + 1} de la reseña`} className="max-h-[88vh] w-auto max-w-full rounded-2xl object-contain" />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}