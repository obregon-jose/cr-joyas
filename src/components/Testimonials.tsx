"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import Reveal from "./Reveal";

const items = [
  { name: "Valentina R.", city: "Bogotá", text: "El anillo superó todas mis expectativas. El empaque, el certificado, el brillo... una experiencia de lujo de principio a fin." },
  { name: "Camilo & Daniela", city: "Medellín", text: "Nuestras argollas de matrimonio quedaron perfectas. Nos acompañaron en cada decisión del diseño. Eternamente agradecidos." },
  { name: "Isabella M.", city: "Cali", text: "Compré el collar con esmeralda para mi mamá y lloró de la emoción. La calidad es impresionante y el envío fue rapidísimo." },
];

export default function Testimonials() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <section id="testimonios" className="mx-auto max-w-4xl px-6 py-28 text-center">
      <Reveal>
        <p className="eyebrow mb-4">Clientes</p>
        <h2 className="section-title mb-14">
          Historias que <span className="gold-text italic">brillan</span>
        </h2>
      </Reveal>
      <Quote className="mx-auto mb-6 h-10 w-10 text-gold-500/60" strokeWidth={1} />
      <div className="relative min-h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -30, filter: "blur(6px)" }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="h-5 w-5 fill-gold-300 text-gold-300" />
              ))}
            </div>
            <p className="font-serif text-2xl italic leading-relaxed md:text-3xl">“{items[i].text}”</p>
            <p className="mt-8 text-sm uppercase tracking-[0.3em] text-gold-300">
              {items[i].name} · <span className="text-white/40">{items[i].city}</span>
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-10 flex justify-center gap-3">
        {items.map((_, d) => (
          <button
            key={d}
            onClick={() => setI(d)}
            aria-label={`Testimonio ${d + 1}`}
            className="relative h-2 overflow-hidden rounded-full bg-white/15 transition-all"
            style={{ width: d === i ? 40 : 8 }}
          >
            {d === i && <motion.span layoutId="dot" className="absolute inset-0 bg-gold-300" />}
          </button>
        ))}
      </div>
    </section>
  );
}
