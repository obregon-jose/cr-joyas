"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { FLY_EVENT, FlyDetail } from "@/lib/cart/fly-to-cart";

type Flight = { id: number; src: string; from: { x: number; y: number }; to: { x: number; y: number } };

const SIZE = 64;

// Botón del carrito pegado al borde derecho de la pantalla.
// Solo se muestra cuando hay productos; sale deslizándose desde el borde.
// Recibe las miniaturas que "saltan" al agregar un producto.
export default function FloatingCart() {
  const { count, setOpen } = useCart();
  const ref = useRef<HTMLButtonElement>(null);
  const idRef = useRef(0);
  const controls = useAnimation();
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    const onFly = (e: Event) => {
      const d = (e as CustomEvent<FlyDetail>).detail;
      const t = ref.current?.getBoundingClientRect();
      if (!t) return;
      const id = ++idRef.current;
      // El botón está pegado al borde derecho (right-0): su centro en X es siempre innerWidth - width/2, aunque aún esté oculto.
      setFlights((f) => [
        ...f,
        { id, src: d.src, from: { x: d.x, y: d.y }, to: { x: document.documentElement.clientWidth - t.width / 2, y: t.top + t.height / 2 } },
      ]);
    };
    window.addEventListener(FLY_EVENT, onFly);
    return () => window.removeEventListener(FLY_EVENT, onFly);
  }, []);

  const land = (id: number) => {
    setFlights((f) => f.filter((x) => x.id !== id));
    controls.start({ scale: [1, 1.22, 1], transition: { duration: 0.45 } });
  };

  return (
    <>
      <motion.button
        ref={ref}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Abrir carrito${count ? ` (${count})` : ""}`}
        initial={{ x: "110%" }}
        animate={{ x: count > 0 ? 0 : "110%" }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        aria-hidden={count === 0}
        tabIndex={count === 0 ? -1 : 0}
        className={`fixed bottom-28 right-0 z-40 ${count === 0 ? "pointer-events-none" : ""}`}
      >
        <motion.span
          animate={controls}
          className="relative flex h-14 items-center rounded-l-full border border-r-0 border-gold-400/40 bg-ink-900/90 pl-5 pr-3 text-gold-200 shadow-[0_0_24px_rgba(217,174,58,0.2)] backdrop-blur transition-colors hover:border-gold-300"
        >
          <ShoppingBag className="h-6 w-6" strokeWidth={1.4} />
          {count > 0 && (
            <motion.span
              key={count}
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-300 px-1 text-[11px] font-semibold text-ink-950"
            >
              {count}
            </motion.span>
          )}
        </motion.span>
      </motion.button>

      {flights.map((f) => {
        const midX = (f.from.x + f.to.x) / 2;
        const midY = Math.min(f.from.y, f.to.y) - 110;
        const h = SIZE / 2;
        return (
          <motion.div
            key={f.id}
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-[90] overflow-hidden rounded-xl border border-gold-300/70 bg-ink-700 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            style={{
              width: SIZE,
              height: SIZE,
              backgroundImage: `url("${f.src}")`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            initial={{ x: f.from.x - h, y: f.from.y - h, scale: 1, opacity: 1 }}
            animate={{
              x: [f.from.x - h, midX - h, f.to.x - h],
              y: [f.from.y - h, midY - h, f.to.y - h],
              scale: [1, 0.85, 0.25],
              opacity: [1, 1, 0.7],
              rotate: [0, -8, 0],
            }}
            transition={{ duration: 0.85, times: [0, 0.45, 1], ease: "easeInOut" }}
            onAnimationComplete={() => land(f.id)}
          />
        );
      })}
    </>
  );
}