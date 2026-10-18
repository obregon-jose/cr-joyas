"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Gem, Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart/cart";
import { useSiteSettings } from "@/lib/site/site-settings";

const links = [
  { href: "#colecciones", label: "Colecciones" },
  { href: "#catalogo", label: "Catálogo" },
  { href: "#atelier", label: "Atelier" },
  { href: "#testimonios", label: "Clientes" },
  { href: "#preguntas", label: "Preguntas" },
  { href: "#contacto", label: "Contacto" },
];

export default function Navbar() {
  const site = useSiteSettings();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menu, setMenu] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 25 });

  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > last && y > 400);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: hidden && !menu ? -100 : 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
          scrolled ? "border-b border-gold-400/10 bg-ink-950/70 backdrop-blur-xl" : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <a href="#inicio" className="group flex items-center gap-3">
            <Gem className="h-6 w-6 text-gold-300 transition-transform duration-700 group-hover:rotate-[360deg]" strokeWidth={1.2} />
            <span className="gold-text font-serif text-2xl tracking-[0.3em]">{site.brand_name.toUpperCase()}</span>
          </a>

          <ul className="hidden items-center gap-10 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="group relative text-xs font-medium uppercase tracking-[0.25em] text-white/70 transition-colors hover:text-gold-200"
                >
                  {l.label}
                  <span className="absolute -bottom-2 left-0 h-px w-0 bg-gold-300 transition-all duration-500 group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setOpen(true)}
              aria-label="Abrir carrito"
              className="relative rounded-full border border-gold-400/30 p-3 transition hover:border-gold-300 hover:bg-gold-400/10"
            >
              <ShoppingBag className="h-5 w-5 text-gold-200" strokeWidth={1.5} />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key={count}
                    initial={{ scale: 0 }}
                    animate={{ scale: [1.6, 1] }}
                    exit={{ scale: 0 }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold-300 text-[10px] font-bold text-ink-950"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
            <button
              className="rounded-full border border-white/10 p-3 lg:hidden"
              onClick={() => setMenu((v) => !v)}
              aria-label="Menú"
            >
              {menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <motion.div
          style={{ scaleX: progress }}
          className="h-[2px] origin-left bg-gradient-to-r from-gold-600 via-gold-200 to-gold-600"
        />
      </motion.header>

      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ clipPath: "circle(0% at 90% 5%)" }}
            animate={{ clipPath: "circle(150% at 90% 5%)" }}
            exit={{ clipPath: "circle(0% at 90% 5%)" }}
            transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8 bg-ink-950 lg:hidden"
          >
            {links.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                onClick={() => setMenu(false)}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07 }}
                className="font-serif text-4xl text-gold-100"
              >
                {l.label}
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}