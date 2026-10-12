"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Heart, Plus } from "lucide-react";
import SafeImage from "./SafeImage";
import { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { useCart } from "@/lib/cart";

type Props = { product: Product; onOpen: (p: Product) => void };

export default function ProductCard({ product, onOpen }: Props) {
  const { add } = useCart();
  const [liked, setLiked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Efecto tilt 3D siguiendo el mouse
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const soldOut = product.stock <= 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className="group relative overflow-hidden rounded-3xl border border-white/5 bg-ink-800"
      >
        <button
          onClick={() => onOpen(product)}
          className="relative block aspect-[4/5] w-full overflow-hidden"
          aria-label={`Ver ${product.name}`}
        >
          <SafeImage
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
        </button>

        {product.featured && (
          <span className="absolute left-4 top-4 rounded-full bg-gold-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-950">
            Destacado
          </span>
        )}
        {soldOut && (
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-950">
            Agotado
          </span>
        )}

        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={() => setLiked((v) => !v)}
          aria-label="Favorito"
          className="absolute right-4 top-4 rounded-full bg-ink-950/60 p-2.5 backdrop-blur-md transition hover:bg-ink-950"
        >
          <Heart className={`h-4 w-4 transition ${liked ? "fill-rose-gold text-rose-gold" : "text-white"}`} />
        </motion.button>

        <div className="flex items-end justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold-400">{product.category}</p>
            <h3 className="mt-1 truncate font-serif text-2xl">{product.name}</h3>
            <p className="mt-1 text-sm text-white/50">{product.material}</p>
            <p className="gold-text mt-3 font-serif text-xl">{formatCOP(product.price)}</p>
          </div>
          <motion.button
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.85 }}
            disabled={soldOut}
            onClick={() => add(product)}
            aria-label="Agregar al carrito"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-300 text-ink-950 transition hover:bg-gold-200 disabled:opacity-30"
          >
            <Plus className="h-5 w-5" />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
