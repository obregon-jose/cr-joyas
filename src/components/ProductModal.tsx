"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, ShoppingBag, Truck, X } from "lucide-react";
import ProductGallery from "./ProductGallery";
import { StarsDisplay } from "./StarRating";
import Price, { DiscountBadge } from "./Price";
import { summarize, usePublicReviews } from "@/lib/reviews";
import { getImages } from "@/lib/images";
import { Product } from "@/lib/types";
import { useCart } from "@/lib/cart";

type Props = { product: Product | null; onClose: () => void };

export default function ProductModal({ product, onClose }: Props) {
  const { add } = useCart();
  const { reviews } = usePublicReviews();
  const rating = product ? summarize(reviews, product.id) : { count: 0, average: 0 };

  useEffect(() => {
    if (!product) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ y: 80, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 60, scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 240 }}
            className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-y-auto rounded-3xl border border-gold-400/20 bg-ink-900 md:grid md:grid-cols-2"
          >
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-4 top-4 z-10 rounded-full bg-ink-950/70 p-2.5 backdrop-blur transition hover:rotate-90 hover:bg-ink-950"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative h-[40vh] min-h-[260px] shrink-0 overflow-hidden md:h-auto md:min-h-[540px]">
              <ProductGallery key={product.id} images={getImages(product)} alt={product.name} />
            </div>

            <div className="flex shrink-0 flex-col justify-center gap-4 p-6 md:gap-6 md:p-12">
              <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="eyebrow">
                {product.category}
              </motion.p>
              <motion.h3 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="font-serif text-3xl leading-tight md:text-5xl">
                {product.name}
              </motion.h3>
              {rating.count > 0 && (
                <a href="#testimonios" onClick={onClose} className="-mt-2 flex w-fit items-center gap-2 text-xs text-white/50 transition hover:text-gold-200">
                  <StarsDisplay value={rating.average} size={16} /> ({rating.count})
                </a>
              )}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="leading-relaxed text-white/60">
                {product.description}
              </motion.p>
              <motion.dl initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="grid grid-cols-2 gap-4 border-y border-white/10 py-5 text-sm">
                <div>
                  <dt className="text-white/40">Material</dt>
                  <dd className="mt-1 text-gold-100">{product.material || "—"}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Disponibilidad</dt>
                  <dd className="mt-1 text-gold-100">{product.stock > 0 ? `${product.stock} unidades` : "Agotado"}</dd>
                </div>
              </motion.dl>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap items-center gap-3">
                <Price product={product} className="text-4xl" />
                <DiscountBadge product={product} />
              </motion.div>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                disabled={product.stock <= 0}
                onClick={(e) => {
                  if (!add(product, e.currentTarget)) return; // sin más unidades: aviso y el modal sigue abierto
                  onClose();
                }}
                className="btn-gold disabled:opacity-40"
              >
                <ShoppingBag className="h-4 w-4" /> Agregar al carrito
              </motion.button>
              <div className="flex flex-wrap gap-6 text-xs text-white/50">
                <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-gold-400" /> Envío asegurado</span>
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-400" /> Certificado incluido</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}