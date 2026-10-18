"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 2.2,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span ref={ref}>
      {val.toLocaleString("es-CO")}
      {suffix}
    </span>
  );
}

const stats = [
  { n: 25, s: "+", label: "Años de maestría" },
  { n: 12000, s: "+", label: "Clientes felices" },
  { n: 100, s: "%", label: "Oro 18k certificado" },
  { n: 340, s: "", label: "Piezas únicas al año" },
];

export default function Atelier() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], ["8%", "-8%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["-6%", "10%"]);

  return (
    <section id="atelier" ref={ref} className="relative overflow-hidden bg-ink-900 py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <div className="relative h-[560px]">
          <motion.div style={{ y: y1 }} className="absolute left-0 top-0 h-[420px] w-[62%] overflow-hidden rounded-3xl">
            <SafeImage
              src="https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&q=80"
              alt="Orfebre trabajando"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.div
            style={{ y: y2 }}
            className="absolute bottom-0 right-0 h-[380px] w-[58%] overflow-hidden rounded-3xl border-4 border-ink-900"
          >
            <SafeImage
              src="https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&q=80"
              alt="Detalle de pulsera"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <div className="absolute left-[48%] top-[38%] flex h-28 w-28 animate-spin-slow items-center justify-center rounded-full border border-gold-400/50 bg-ink-950/80 text-center backdrop-blur">
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold-300">Hecho<br />a mano</span>
          </div>
        </div>

        <div>
          <Reveal>
            <p className="eyebrow mb-4">Nuestro atelier</p>
            <h2 className="section-title">
              Cada joya, una <span className="gold-text italic">obra de arte</span>
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-8 max-w-lg leading-relaxed text-white/60">
              En nuestro taller de Cali, maestros orfebres transforman oro, diamantes y esmeraldas colombianas en piezas
              que acompañan los momentos más importantes de la vida. Diseñamos, fundimos, engastamos y pulimos cada
              detalle a mano.
            </p>
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-8">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={0.1 * i}>
                <p className="gold-text font-serif text-5xl">
                  <Counter to={s.n} suffix={s.s} />
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
