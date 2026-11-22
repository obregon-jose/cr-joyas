"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Gift, Snowflake, X } from "lucide-react";
import Snow from "@/components/christmas/Snow";
import { greetingFor, isChristmasSeason } from "@/lib/christmas";

// Temporada navideña de la tienda:
//  · nieve dorada suave, encendida desde el inicio (con un botón ❄ para quien prefiera la página quieta;
//    si el dispositivo pide "reducir movimiento" cae más lenta y con menos copos),
//  · un saludo amable con cuenta regresiva, que sale una sola vez por temporada,
//  · se activa y se apaga sola por fechas (ver lib/christmas.ts).
// Con "reducir movimiento" activo el saludo no lleva destellos animados.

const SNOW_KEY = "crj-xmas-snow"; // "off" si el visitante apagó la nieve
const HELLO_KEY = "crj-xmas-hello"; // año de la temporada en que ya cerró el saludo

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export default function Christmas() {
  const reduce = useReducedMotion();
  const [on, setOn] = useState(false); // temporada activa (se decide en el navegador para usar la fecha del visitante)
  const [snow, setSnow] = useState(true);
  const [hello, setHello] = useState(false);
  const [hint, setHint] = useState(false);

  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => greetingFor(now), [now]);
  const season = String(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  useEffect(() => {
    if (!isChristmasSeason()) return;
    setOn(true);
    document.documentElement.dataset.xmas = "on"; // gancho para decorar más cosas con CSS
    let timer = 0;
    if (read(HELLO_KEY) !== season) timer = window.setTimeout(() => setHello(true), 4200); // después de la intro de la tienda
    return () => {
      window.clearTimeout(timer);
      delete document.documentElement.dataset.xmas;
    };
  }, [season]);

  // Nieve: encendida por defecto; solo se apaga si el visitante la apagó él mismo.
  useEffect(() => {
    setSnow(read(SNOW_KEY) !== "off");
  }, []);

  const closeHello = () => {
    setHello(false);
    write(HELLO_KEY, season);
  };

  useEffect(() => {
    if (!hello) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeHello();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hello]);

  const toggleSnow = () => {
    const next = !snow;
    setSnow(next);
    write(SNOW_KEY, next ? "on" : "off");
    setHint(true);
    window.setTimeout(() => setHint(false), 1800);
  };

  if (!on) return null;

  return (
    <>
      {snow && <Snow calm={!!reduce} />}

      {/* Interruptor de nieve, sobre el botón de WhatsApp */}
        <div className="fixed bottom-24 left-6 z-40">
          {/* <AnimatePresence>
            {hint && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                role="status"
                className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-gold-300/30 bg-ink-900/95 px-3 py-1.5 text-xs text-white/80 shadow-lg"
              >
                {snow ? "Nieve activada" : "Nieve apagada"}
              </motion.span>
            )}
          </AnimatePresence> */}
          <motion.button
            type="button"
            onClick={toggleSnow}
            aria-pressed={snow}
            aria-label={snow ? "Apagar la nieve" : "Encender la nieve"}
            title={snow ? "Apagar la nieve" : "Encender la nieve"}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 4.4, type: "spring" }}
            whileTap={{ scale: 0.92 }}
            className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-md transition-colors ${
              snow
                ? "border-gold-300/50 bg-ink-900/80 text-gold-200 shadow-[0_0_20px_rgba(233,200,92,0.25)]"
                : "border-white/15 bg-ink-900/80 text-white/45 hover:text-gold-200"
            }`}
          >
            <Snowflake className="h-5 w-5" />
          </motion.button>
        </div>

      {/* Saludo con cuenta regresiva */}
      <AnimatePresence>
        {hello && (
          <motion.aside
            role="region"
            aria-label="Mensaje de Navidad"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-3 bottom-3 z-[60] mx-auto w-auto max-w-sm overflow-hidden rounded-3xl border border-gold-300/30 bg-ink-900/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8),0_0_60px_-20px_rgba(233,200,92,0.35)] backdrop-blur-xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:mx-0 sm:w-[360px] sm:p-6"
          >
            {/* Brillo dorado de fondo y destellos */}
            <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-gold-300/10 blur-2xl" />
            {!reduce &&
              [
                { l: "78%", t: "14%", d: 0, s: 5 },
                { l: "90%", t: "34%", d: 1.1, s: 4 },
                { l: "66%", t: "6%", d: 2, s: 3 },
              ].map((p, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="pointer-events-none absolute animate-twinkle rounded-full bg-gold-200"
                  style={{ left: p.l, top: p.t, width: p.s, height: p.s, animationDelay: `${p.d}s`, boxShadow: "0 0 10px #f5df8f" }}
                />
              ))}

            <button
              type="button"
              onClick={closeHello}
              aria-label="Cerrar mensaje"
              className="absolute right-3 top-3 rounded-full p-2 text-white/40 transition hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gold-300/30 bg-gold-300/10 text-gold-200">
                <Gift className="h-6 w-6" />
              </span>
              <div className="min-w-0 pr-6">
                <p className="eyebrow !text-[10px]">Temporada navideña</p>
                <h2 className="gold-text mt-1 font-serif text-3xl leading-tight">{greeting.title}</h2>
              </div>
            </div>

            {greeting.count !== null && (
              <div className="relative mt-4 flex items-baseline gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="gold-text font-serif text-4xl leading-none">{greeting.count}</span>
                <span className="text-sm text-white/60">{greeting.countLabel}</span>
              </div>
            )}

            <p className="relative mt-4 text-sm leading-relaxed text-white/70">{greeting.text}</p>

            <div className="relative mt-5 flex flex-wrap gap-2">
              <a href="#catalogo" onClick={closeHello} className="btn-gold !px-6 !py-2.5 !text-xs">
                Ver regalos
              </a>
              <button type="button" onClick={closeHello} className="btn-ghost !px-5 !py-2.5 !text-xs">
                Más tarde
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}