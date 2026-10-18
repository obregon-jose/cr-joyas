"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useScroll, useTransform } from "framer-motion";
import Reveal from "@/components/ui/Reveal";
import SafeImage from "@/components/ui/SafeImage";
import { parseTitle, useSiteSettings } from "@/lib/site/site-settings";

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

export default function Atelier() {
  const site = useSiteSettings();
  const words = parseTitle(site.atelier_title);
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
              src={site.atelier_image1}
              alt="Orfebre trabajando"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <motion.div
            style={{ y: y2 }}
            className="absolute bottom-0 right-0 h-[380px] w-[58%] overflow-hidden rounded-3xl border-4 border-ink-900"
          >
            <SafeImage
              src={site.atelier_image2}
              alt="Detalle de pulsera"
              className="h-full w-full object-cover"
            />
          </motion.div>
          {site.atelier_badge.trim() && (
            <div className="absolute left-[48%] top-[38%] flex h-28 w-28 animate-spin-slow items-center justify-center rounded-full border border-gold-400/50 bg-ink-950/80 p-3 text-center backdrop-blur">
              <span className="text-[10px] uppercase leading-snug tracking-[0.3em] text-gold-300" style={{ textWrap: "balance" }}>
                {site.atelier_badge}
              </span>
            </div>
          )}
        </div>

        <div>
          <Reveal>
            {site.atelier_eyebrow && <p className="eyebrow mb-4">{site.atelier_eyebrow}</p>}
            <h2 className="section-title">
              {words.map((w, i) => (
                <span key={i}>
                  {w.gold ? <span className="gold-text italic">{w.word}</span> : w.word}
                  {i < words.length - 1 ? " " : ""}
                </span>
              ))}
              
            </h2>
          </Reveal>
          {site.atelier_text && (
            <Reveal delay={0.15}>
              <p className="mt-8 max-w-lg whitespace-pre-line leading-relaxed text-white/60">{site.atelier_text}</p>
            </Reveal>
          )}
          {site.atelier_stats.length > 0 && (
            <div className="mt-12 grid grid-cols-2 gap-8">
              {site.atelier_stats.map((st, i) => (
                <Reveal key={`${st.label}-${i}`} delay={0.1 * i}>
                  <p className="gold-text font-serif text-5xl">
                    <Counter to={st.value} suffix={st.suffix} />
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">{st.label}</p>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}