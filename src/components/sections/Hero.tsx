"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import { parseTitle, useSiteSettings } from "@/lib/site/site-settings";



const sparkles = Array.from({ length: 18 }, (_, i) => ({
  left: `${(i * 53) % 100}%`,
  top: `${(i * 37) % 100}%`,
  delay: (i % 6) * 0.5,
  size: 4 + (i % 4) * 3,
}));

export default function Hero() {
  const site = useSiteSettings();
const words = parseTitle(site.hero_title);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.25]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "60%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 180]);

  return (
    <section id="inicio" ref={ref} className="relative flex min-h-screen items-center overflow-hidden">
      <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-0">
        <SafeImage
          src={site.hero_image}
          alt="Joyería de lujo"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
      </motion.div>

      <motion.svg
        style={{ rotate: ringRotate }}
        className="pointer-events-none absolute -right-40 top-1/2 hidden h-[640px] w-[640px] -translate-y-1/2 opacity-30 md:block"
        viewBox="0 0 200 200"
      >
        <defs>
          <path id="circ" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0" />
        </defs>
        <circle cx="100" cy="100" r="95" fill="none" stroke="#c4932a" strokeWidth="0.3" />
        <circle cx="100" cy="100" r="70" fill="none" stroke="#c4932a" strokeWidth="0.3" strokeDasharray="2 4" />
        <text fill="#e9c85c" fontSize="7" letterSpacing="5" className="font-serif">
          <textPath href="#circ"> ORO 18K · DIAMANTES · ESMERALDAS · ORO 18K · DIAMANTES ·</textPath>
        </text>
      </motion.svg>

      {sparkles.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle rounded-full bg-gold-200"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animationDelay: `${s.delay}s`, boxShadow: "0 0 12px #f5df8f" }}
        />
      ))}

      <motion.div style={{ y: textY, opacity }} className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-24">
        <motion.p
          initial={{ opacity: 0, letterSpacing: "0.1em" }}
          animate={{ opacity: 1, letterSpacing: "0.45em" }}
          transition={{ delay: 2.4, duration: 1.4 }}
          className="eyebrow mb-8 flex items-center gap-3"
        >
          <Sparkles className="h-4 w-4" /> {site.hero_eyebrow}
        </motion.p>

        <h1 className="max-w-4xl font-serif text-6xl font-medium leading-[0.95] sm:text-7xl md:text-8xl lg:text-9xl">
          {words.map((w, i) => (
            <span key={i} className="mr-4 inline-block overflow-hidden align-bottom">
              <motion.span
                className={`inline-block ${w.gold ? "gold-text italic" : ""}`}
                initial={{ y: "110%", rotate: 6 }}
                animate={{ y: 0, rotate: 0 }}
                transition={{ delay: 2.5 + i * 0.12, duration: 1, ease: [0.22, 1, 0.36, 1] }}
              >
                {w.word}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.3, duration: 1 }}
          className="mt-8 max-w-xl text-base leading-relaxed text-white/70 md:text-lg"
        >
          {site.hero_text}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.5, duration: 1 }}
          className="mt-12 flex flex-wrap gap-4"
        >
          <a href="#catalogo" className="btn-gold">{site.hero_cta1}</a>
          <a href="#atelier" className="btn-ghost">{site.hero_cta2}</a>
        </motion.div>
      </motion.div>

      <motion.a
        href="#colecciones"
        aria-label="Bajar"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 4 }}
        className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2"
      >
        
      </motion.a>
    </section>
  );
}
