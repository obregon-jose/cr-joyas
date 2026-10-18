"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import SafeImage from "./SafeImage";
import { StarsDisplay } from "./StarRating";
const fullDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
import { PublicReview } from "@/lib/reviews";

type Props = {
  reviews: PublicReview[];
  index: number | null;
  onChange: (i: number) => void;
  onClose: () => void;
};

/** Reseña completa: texto + todas sus fotos. Deslizar a los lados (o las flechas) pasa a la siguiente reseña. */
export default function ReviewDetail({ reviews, index, onChange, onClose }: Props) {
  return (
    <AnimatePresence>
      {index !== null && reviews[index] && <Viewer key="viewer" reviews={reviews} index={index} onChange={onChange} onClose={onClose} />}
    </AnimatePresence>
  );
}

const variants = {
  enter: (d: number) => ({ opacity: 0, x: d * 70 }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -70 }),
};

function Viewer({ reviews, index, onChange, onClose }: { reviews: PublicReview[]; index: number; onChange: (i: number) => void; onClose: () => void }) {
  const [dir, setDir] = useState(0);
  const total = reviews.length;
  const review = reviews[index];

  const go = useCallback(
    (step: number) => {
      setDir(step);
      onChange((index + step + total) % total);
    },
    [index, total, onChange]
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (total > 1 && e.key === "ArrowRight") go(1);
      if (total > 1 && e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [go, onClose, total]);

  const nav = "rounded-full border border-white/15 p-2.5 transition hover:border-gold-300/60 hover:text-gold-300";

  return (
    <motion.div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-ink-950/90 backdrop-blur-md" onClick={onClose} />

      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-gold-400/20 bg-ink-900">
        <button onClick={onClose} aria-label="Cerrar" className="absolute right-3 top-3 z-20 rounded-full bg-ink-950/70 p-2.5 backdrop-blur transition hover:rotate-90">
          <X className="h-5 w-5" />
        </button>

        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={review.id}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              drag={total > 1 ? "x" : false}
              dragDirectionLock
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -70) go(1);
                else if (info.offset.x > 70) go(-1);
              }}
              className="touch-pan-y"
            >
              <Content review={review} />
            </motion.div>
          </AnimatePresence>
        </div>

        {total > 1 && (
          <div className="flex items-center justify-center gap-5 border-t border-white/10 px-4 py-3">
            <button onClick={() => go(-1)} aria-label="Reseña anterior" className={nav}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-14 text-center text-xs tracking-[0.25em] text-white/45">
              {index + 1} / {total}
            </span>
            <button onClick={() => go(1)} aria-label="Reseña siguiente" className={nav}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Content({ review: r }: { review: PublicReview }) {
  const hasPhotos = r.images.length > 0;

  const text = (
    <div className={`flex flex-col justify-center gap-5 p-7 sm:p-10 ${hasPhotos ? "" : "mx-auto max-w-2xl text-center"}`}>
      <div className={hasPhotos ? "" : "flex flex-col items-center"}>
        <StarsDisplay value={r.rating} size={22} />
        {r.product_name && <p className="mt-2 text-sm text-white/50">{r.product_name}</p>}
      </div>
      <p className={hasPhotos ? "whitespace-pre-line leading-relaxed text-white/80" : "whitespace-pre-line font-serif text-2xl italic leading-relaxed text-white/90 sm:text-3xl"}>
        {hasPhotos ? r.comment : `“${r.comment}”`}
      </p>
      <div className={`flex items-center gap-3 border-t border-white/10 pt-5 ${hasPhotos ? "" : "justify-center"}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-200 font-serif text-xl text-ink-950">
          {r.customer_name.trim().charAt(0).toUpperCase()}
        </span>
        <div className={hasPhotos ? "min-w-0" : "min-w-0 text-left"}>
          <p className="text-sm text-white/90">
            {r.customer_name}
          </p>
          <p className="text-xs text-white/40">
            {fullDate(r.created_at)}
          </p>
        </div>
      </div>
    </div>
  );

  if (!hasPhotos) return <div className="py-6">{text}</div>;

  return (
    <div className="grid md:grid-cols-2">
      <Photos images={r.images} />
      {text}
    </div>
  );
}

/** Foto principal con botones para cambiarla y todas las miniaturas a la vista. */
function Photos({ images }: { images: string[] }) {
  const [i, setI] = useState(0);
  const many = images.length > 1;
  const arrow = "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-ink-950/60 p-2 backdrop-blur transition hover:border-gold-300/60 hover:text-gold-300";

  return (
    <div className="relative aspect-[4/3] bg-ink-800 md:aspect-auto md:min-h-[460px]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
          <SafeImage src={images[i]} alt={`Foto ${i + 1} de la reseña`} className="h-full w-full object-cover" />
        </motion.div>
      </AnimatePresence>

      {many && (
        <>
          <button type="button" onClick={() => setI((v) => (v - 1 + images.length) % images.length)} aria-label="Foto anterior" className={`${arrow} left-3`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setI((v) => (v + 1) % images.length)} aria-label="Foto siguiente" className={`${arrow} right-3`}>
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-2">
            {images.map((src, k) => (
              <button
                key={src + k}
                type="button"
                onClick={() => setI(k)}
                aria-label={`Ver foto ${k + 1}`}
                className={`h-12 w-12 overflow-hidden rounded-lg border-2 transition ${k === i ? "border-gold-300" : "border-white/25 opacity-70 hover:opacity-100"}`}
              >
                <SafeImage src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}