"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, ShoppingCart, Check, Eye } from "lucide-react";
import { getImages } from "@/lib/images";

import SafeImage from "./SafeImage";
import { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { useCart } from "@/lib/cart";

type Props = {
  product: Product;
  onOpen: (p: Product) => void;
};

const FAVORITES_KEY = "joyeria-favorites";

export default function ProductCard({ product, onOpen }: Props) {
  const { add } = useCart();

  const [liked, setLiked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [added, setAdded] = useState(false);

  const soldOut = product.stock <= 0;
  const productId = String(product.id);

  // Recuperar el estado de favoritos desde localStorage.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      const favorites: string[] = stored ? JSON.parse(stored) : [];

      setLiked(favorites.includes(productId));
    } catch {
      setLiked(false);
    } finally {
      setMounted(true);
    }
  }, [productId]);

  // Agregar o quitar un producto de favoritos.
  const toggleFavorite = () => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      const parsed: unknown = stored ? JSON.parse(stored) : [];

      const favorites: string[] = Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];

      const nextFavorites = favorites.includes(productId)
        ? favorites.filter((id) => id !== productId)
        : [...favorites, productId];

      localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites));

      setLiked(nextFavorites.includes(productId));
    } catch (error) {
      console.error("No se pudieron guardar los favoritos:", error);
    }
  };

  // Agregar al carrito y mostrar una confirmación visual.
  const handleAddToCart = () => {
    if (soldOut || added) return;

    add(product);
    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 1200);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -5 }}
      className="group relative"
    >
      <div
        className="
          relative overflow-hidden rounded-2xl sm:rounded-3xl
          border border-white/[0.06]
          bg-ink-800
          transition-[border-color,box-shadow]
          duration-700 ease-out
          group-hover:border-gold-300/30
          group-hover:shadow-[0_20px_60px_-25px_rgba(212,175,55,0.18)]
        "
      >
        {/* Imagen del producto */}
        <button
          onClick={() => onOpen(product)}
          className="relative block aspect-[4/5] w-full overflow-hidden"
          aria-label={`Ver ${product.name}`}
        >
          <motion.div
            className="h-full w-full"
            whileHover={{ scale: 1.045 }}
            transition={{
              duration: 1.2,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <SafeImage
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </motion.div>

          {/* Degradado cinematográfico */}
          <div
            className="
              pointer-events-none absolute inset-0
              bg-gradient-to-t
              from-ink-950/85 via-ink-950/5 to-ink-950/10
            "
          />

          {/* Reflejo dorado */}
          <div
            className="
              pointer-events-none absolute inset-0
              -translate-x-[150%] skew-x-[-18deg]
              bg-gradient-to-r
              from-transparent via-gold-200/[0.13] to-transparent
              transition-transform duration-[1400ms]
              ease-in-out
              group-hover:translate-x-[150%]
            "
          />

          {getImages(product).length > 1 && (
  <span
    aria-hidden
    className="pointer-events-none absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full bg-ink-950/30 text-white/80 opacity-0 backdrop-blur-[2px] transition duration-500 group-hover:scale-100 group-hover:opacity-100 group-active:scale-100 group-active:opacity-100 sm:h-12 sm:w-12"
  >
    <Eye className="h-5 w-5 sm:h-6 sm:w-6" />
  </span>
)}

          {/* Brillo ambiental */}
          <div
            className="
              pointer-events-none absolute inset-0
              opacity-0 transition-opacity duration-700
              bg-[radial-gradient(ellipse_at_50%_35%,rgba(212,175,55,0.10),transparent_65%)]
              group-hover:opacity-100
            "
          />
        </button>

        {/* Etiqueta de producto destacado */}
        {product.featured && !soldOut && (
          <span
            className="
              absolute left-2 top-2 z-10 sm:left-4 sm:top-4
              rounded-full border border-gold-200/30
              bg-ink-950/55 px-2 py-1 sm:px-3 sm:py-1.5
              text-[8px] font-medium uppercase sm:text-[9px]
              tracking-[0.18em] text-gold-300 sm:tracking-[0.22em]
              backdrop-blur-md
            "
          >
            Destacado
          </span>
        )}

        {/* Etiqueta de agotado */}
        {soldOut && (
          <span
            className="
              absolute left-2 top-2 z-10 sm:left-4 sm:top-4
              rounded-full bg-white/90 px-2 py-1 sm:px-3 sm:py-1.5
              text-[8px] font-semibold uppercase sm:text-[9px]
              tracking-[0.18em] text-ink-950 sm:tracking-[0.2em]
            "
          >
            Agotado
          </span>
        )}

        {/* Favoritos persistentes */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={toggleFavorite}
          aria-label={liked ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={mounted && liked}
          className="
            absolute right-2 top-2 z-10 sm:right-4 sm:top-4
            flex h-8 w-8 items-center justify-center sm:h-10 sm:w-10
            rounded-full border border-white/10
            bg-ink-950/45 backdrop-blur-md
            transition-colors duration-300
            hover:border-gold-300/40 hover:bg-ink-950/75
          "
        >
          <Heart
            className={`h-3.5 w-3.5 transition-all duration-300 sm:h-4 sm:w-4 ${
              liked ? "fill-rose-gold text-rose-gold" : "text-white/80"
            }`}
          />
        </motion.button>

        {/* Información del producto */}
        <div className="flex items-end justify-between gap-2 p-3 sm:gap-3 sm:p-5">
          <div className="min-w-0">
            <p className="truncate text-[8px] uppercase tracking-[0.2em] text-gold-400 sm:text-[9px] sm:tracking-[0.28em]">
              {product.category}
            </p>

            <h3
              className="
                mt-1 line-clamp-2 min-h-[2.5em] font-serif text-[15px] leading-tight sm:mt-2 sm:line-clamp-1 sm:min-h-0 sm:text-2xl
                text-white transition-colors duration-500
                group-hover:text-gold-200
              "
            >
              {product.name}
            </h3>

            <p className="mt-0.5 truncate text-[11px] text-white/45 sm:mt-1 sm:text-sm">
              {product.material}
            </p>

            <p className="gold-text mt-1.5 font-serif text-base sm:mt-3 sm:text-xl">
              {formatCOP(product.price)}
            </p>
          </div>

          {/* Botón del carrito con transición plana */}
          <motion.button
            whileHover={soldOut ? undefined : { scale: 1.04 }}
            whileTap={soldOut ? undefined : { scale: 0.96 }}
            disabled={soldOut}
            onClick={handleAddToCart}
            aria-label={
              soldOut
                ? "Producto agotado"
                : added
                  ? "Producto agregado"
                  : "Agregar al carrito"
            }
            className="
              group/cart relative
              flex h-9 w-9 shrink-0 sm:h-12 sm:w-12
              items-center justify-center
              rounded-full border border-gold-300/70
              bg-gold-300 text-ink-950
              transition-colors duration-300
              hover:border-gold-200 hover:bg-gold-200
              hover:shadow-[0_0_24px_rgba(212,175,55,0.20)]
              disabled:cursor-not-allowed disabled:opacity-30
            "
          >
            {added ? (
              <Check className="h-4 w-4 sm:h-5 sm:w-5" />
            ) : (
              <>
                <Plus className="h-4 w-4 group-hover/cart:hidden sm:h-5 sm:w-5" />
                <ShoppingCart className="hidden h-4 w-4 group-hover/cart:block sm:h-5 sm:w-5" />
              </>
            )}
          </motion.button>
        </div>

        {/* Línea dorada inferior */}
        <div
          className="
            absolute bottom-0 left-0 h-px w-full
            origin-left scale-x-0
            bg-gradient-to-r
            from-transparent via-gold-300/70 to-transparent
            transition-transform duration-700 ease-out
            group-hover:scale-x-100
          "
        />
      </div>
    </motion.div>
  );
}
