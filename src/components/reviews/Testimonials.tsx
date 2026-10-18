"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, Quote } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import ReviewDetail from "@/components/reviews/ReviewDetail";
import ReviewModal from "@/components/reviews/ReviewModal";
import { StarsDisplay } from "@/components/ui/StarRating";
import { PublicReview, summarize, usePublicReviews, useReviewable } from "@/lib/reviews/reviews";

// Se muestran mientras todavía no hay reseñas reales aprobadas.
const FALLBACK: PublicReview[] = [
  { id: "f1", product_id: null, product_name: null, rating: 5, customer_name: "Valentina R.", comment: "El anillo superó todas mis expectativas. El empaque, el certificado, el brillo... una experiencia de lujo de principio a fin.", images: [], verified: false, created_at: "2026-09-01T00:00:00Z" },
  { id: "f2", product_id: null, product_name: null, rating: 5, customer_name: "Camilo & Daniela", comment: "Nuestras argollas de matrimonio quedaron perfectas. Nos acompañaron en cada decisión del diseño. Eternamente agradecidos.", images: [], verified: false, created_at: "2026-08-01T00:00:00Z" },
  { id: "f3", product_id: null, product_name: null, rating: 4.5, customer_name: "Isabella M.", comment: "Compré el collar con esmeralda para mi mamá y lloró de la emoción. La calidad es impresionante y el envío fue rapidísimo.", images: [], verified: false, created_at: "2026-07-01T00:00:00Z" },
];

export default function Testimonials() {
  const { reviews, reload } = usePublicReviews();
  const { items, refresh } = useReviewable();
  const [modal, setModal] = useState<"write" | "claim" | null>(null);
  const [detail, setDetail] = useState<number | null>(null);

  const real = reviews.length > 0;
  const list = real ? reviews : FALLBACK;
  const stats = useMemo(() => summarize(reviews), [reviews]);
  const pending = items.filter((i) => !i.reviewed);

  // ---- Carrusel original: un testimonio a la vez ----
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const n = list.length;
  const cur = list[Math.min(i, n - 1)];

  useEffect(() => {
    if (n < 2 || hover || detail !== null || modal !== null) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, hover, detail, modal]);

  return (
    <section id="testimonios" className="mx-auto max-w-4xl px-6 py-28">
      <Reveal>
        <div className="text-center">
          <p className="eyebrow mb-4">Clientes</p>
          <h2 className="section-title mb-6">
            Historias que <span className="gold-text italic">brillan</span>
          </h2>
        </div>
      </Reveal>

      {/* Invitación a reseñar: solo a quien tiene una compra pendiente de reseñar */}
      <div className="mx-auto mb-12 mt-8 max-w-xl text-center">
        {pending.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-sm text-white/60">Gracias por tu compra. ¿Nos cuentas qué te pareció?</p>
            <button onClick={() => setModal("write")} className="btn-gold">
              <MessageSquarePlus className="h-4 w-4" /> Escribir una reseña
            </button>
          </motion.div>
        )}
      </div>

      {/* Carrusel */}
      <div className="mx-auto max-w-4xl text-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <Quote className="mx-auto mb-6 h-10 w-10 text-gold-500/60" strokeWidth={1} />
        <div className="relative min-h-[260px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.id}
              initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -30, filter: "blur(6px)" }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-6 flex justify-center">
                <StarsDisplay value={cur.rating} size={20} />
              </div>
              <p className="font-serif text-2xl italic leading-relaxed md:text-3xl">“{cur.comment}”</p>

              {cur.images.length > 0 && (
                <div className="mt-7 flex justify-center gap-2.5">
                  {cur.images.slice(0, 4).map((src, k) => (
                    <button
                      key={src}
                      onClick={() => real && setDetail(i)}
                      aria-label={`Ver foto ${k + 1} de la reseña`}
                      className="group relative h-14 w-14 overflow-hidden rounded-lg border border-gold-400/30 transition hover:border-gold-300 sm:h-16 sm:w-16"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                      {k === 3 && cur.images.length > 4 && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs text-white">+{cur.images.length - 4}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {cur.product_name && (
                <p className="mt-3 text-xs tracking-wide text-white/45">{cur.product_name}</p>
              )}

              <p className="mt-8 text-sm uppercase tracking-[0.3em] text-gold-300">
                {cur.customer_name}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-10 flex justify-center gap-3">
          {list.map((r, d) => (
            <button
              key={r.id}
              onClick={() => setI(d)}
              aria-label={`Testimonio ${d + 1}`}
              className="relative h-2 overflow-hidden rounded-full bg-white/15 transition-all"
              style={{ width: d === i ? 40 : 8 }}
            >
              {d === i && <motion.span layoutId="dot" className="absolute inset-0 bg-gold-300" />}
            </button>
          ))}
        </div>
        {real && (
          <div className="mx-auto mt-8 flex w-fit items-center gap-3">
            <StarsDisplay value={stats.average} size={20} />
            <span className="text-sm text-white/55">{stats.count} {stats.count === 1 ? "reseña" : "reseñas"}</span>
          </div>
        )}
      </div>

      <ReviewDetail reviews={list} index={real ? detail : null} onChange={setDetail} onClose={() => setDetail(null)} />

      <ReviewModal
        open={modal !== null}
        mode={modal ?? "write"}
        options={pending}
        onClose={() => setModal(null)}
        onDone={() => {
          refresh();
          reload();
        }}
      />
    </section>
  );
}