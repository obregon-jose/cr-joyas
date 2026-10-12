// "use client";

// import { useRef, useState } from "react";
// import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
// import { Heart, Plus } from "lucide-react";
// import SafeImage from "./SafeImage";
// import { Product } from "@/lib/types";
// import { formatCOP } from "@/lib/format";
// import { useCart } from "@/lib/cart";

// type Props = { product: Product; onOpen: (p: Product) => void };

// export default function ProductCard({ product, onOpen }: Props) {
//   const { add } = useCart();
//   const [liked, setLiked] = useState(false);
//   const ref = useRef<HTMLDivElement>(null);

//   // Efecto tilt 3D siguiendo el mouse
//   const mx = useMotionValue(0);
//   const my = useMotionValue(0);
//   const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
//   const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

//   const onMove = (e: React.MouseEvent) => {
//     const r = ref.current?.getBoundingClientRect();
//     if (!r) return;
//     mx.set((e.clientX - r.left) / r.width - 0.5);
//     my.set((e.clientY - r.top) / r.height - 0.5);
//   };
//   const onLeave = () => {
//     mx.set(0);
//     my.set(0);
//   };

//   const soldOut = product.stock <= 0;

//   return (
//     <motion.div
//       layout
//       initial={{ opacity: 0, scale: 0.9, y: 30 }}
//       animate={{ opacity: 1, scale: 1, y: 0 }}
//       exit={{ opacity: 0, scale: 0.9 }}
//       transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
//       style={{ perspective: 900 }}
//     >
//       <motion.div
//         ref={ref}
//         onMouseMove={onMove}
//         onMouseLeave={onLeave}
//         style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
//         className="group relative overflow-hidden rounded-3xl border border-white/5 bg-ink-800"
//       >
//         <button
//           onClick={() => onOpen(product)}
//           className="relative block aspect-[4/5] w-full overflow-hidden"
//           aria-label={`Ver ${product.name}`}
//         >
//           <SafeImage
//             src={product.image_url}
//             alt={product.name}
//             className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
//           />
//           <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent to-transparent" />
//           <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
//         </button>

//         {product.featured && (
//           <span className="absolute left-4 top-4 rounded-full bg-gold-300 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-950">
//             Destacado
//           </span>
//         )}
//         {soldOut && (
//           <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-ink-950">
//             Agotado
//           </span>
//         )}

//         <motion.button
//           whileTap={{ scale: 0.8 }}
//           onClick={() => setLiked((v) => !v)}
//           aria-label="Favorito"
//           className="absolute right-4 top-4 rounded-full bg-ink-950/60 p-2.5 backdrop-blur-md transition hover:bg-ink-950"
//         >
//           <Heart className={`h-4 w-4 transition ${liked ? "fill-rose-gold text-rose-gold" : "text-white"}`} />
//         </motion.button>

//         <div className="flex items-end justify-between gap-3 p-5">
//           <div className="min-w-0">
//             <p className="text-[10px] uppercase tracking-[0.3em] text-gold-400">{product.category}</p>
//             <h3 className="mt-1 truncate font-serif text-2xl">{product.name}</h3>
//             <p className="mt-1 text-sm text-white/50">{product.material}</p>
//             <p className="gold-text mt-3 font-serif text-xl">{formatCOP(product.price)}</p>
//           </div>
//           <motion.button
//             whileHover={{ rotate: 90 }}
//             whileTap={{ scale: 0.85 }}
//             disabled={soldOut}
//             onClick={() => add(product)}
//             aria-label="Agregar al carrito"
//             className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold-300 text-ink-950 transition hover:bg-gold-200 disabled:opacity-30"
//           >
//             <Plus className="h-5 w-5" />
//           </motion.button>
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, ShoppingCart, Check } from "lucide-react";

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
          relative overflow-hidden rounded-3xl
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
              absolute left-4 top-4 z-10
              rounded-full border border-gold-200/30
              bg-ink-950/55 px-3 py-1.5
              text-[9px] font-medium uppercase
              tracking-[0.22em] text-gold-300
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
              absolute left-4 top-4 z-10
              rounded-full bg-white/90 px-3 py-1.5
              text-[9px] font-semibold uppercase
              tracking-[0.2em] text-ink-950
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
            absolute right-4 top-4 z-10
            flex h-10 w-10 items-center justify-center
            rounded-full border border-white/10
            bg-ink-950/45 backdrop-blur-md
            transition-colors duration-300
            hover:border-gold-300/40 hover:bg-ink-950/75
          "
        >
          <Heart
            className={`h-4 w-4 transition-all duration-300 ${
              liked ? "fill-rose-gold text-rose-gold" : "text-white/80"
            }`}
          />
        </motion.button>

        {/* Información del producto */}
        <div className="flex items-end justify-between gap-3 p-5">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.28em] text-gold-400">
              {product.category}
            </p>

            <h3
              className="
                mt-2 truncate font-serif text-2xl
                text-white transition-colors duration-500
                group-hover:text-gold-200
              "
            >
              {product.name}
            </h3>

            <p className="mt-1 text-sm text-white/45">{product.material}</p>

            <p className="gold-text mt-3 font-serif text-xl">
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
    flex h-12 w-12 shrink-0
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
              <Check className="h-5 w-5" />
            ) : (
              <>
                <Plus className="h-5 w-5 group-hover/cart:hidden" />
                <ShoppingCart className="hidden h-5 w-5 group-hover/cart:block" />
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
