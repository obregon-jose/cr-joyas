"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Plus, ShoppingCart, Check, Eye, ChevronLeft, ChevronRight } from "lucide-react";

import SafeImage from "@/components/ui/SafeImage";
import { Product } from "@/lib/types";
import { useCart } from "@/lib/cart/cart";
import { allImages, focusImage } from "@/lib/catalog/variants";
import Price, { DiscountBadge } from "@/components/catalog/Price";
import { onSale } from "@/lib/catalog/promo";
import { isNew } from "@/lib/catalog/new-badge";
import { hasVariants, isSoldOut } from "@/lib/catalog/stock";
import { useFavorites } from "@/lib/catalog/favorites";

type Props = {
  product: Product;
  onOpen: (p: Product) => void;
};

export default function ProductCard({ product, onOpen }: Props) {
  const { add } = useCart();

  const { has, toggle, ready: mounted } = useFavorites();
  const [added, setAdded] = useState(false);

  const soldOut = isSoldOut(product);
  const options = product.variants ?? [];
  const [optId, setOptId] = useState<string | null>(null); // opción (color) resaltada con los puntos de la tarjeta
  const shownOpt = options.find((v) => v.id === optId) ?? null;
  // La tarjeta lleva todas las fotos (generales + de cada color); al elegir un color se enfoca la suya, sin quitar las demás.
  const gallery = allImages(product).slice(0, 8);
  const [idx, setIdx] = useState(0); // foto que se muestra en la tarjeta
  const [manual, setManual] = useState(false); // true si ya usó las flechas o un color: se desactiva la vista previa de la 2ª foto
  const step = (e: React.MouseEvent, d: number) => {
    e.stopPropagation();
    setManual(true);
    setIdx((i) => (i + d + gallery.length) % gallery.length);
  };
  const pick = (v: (typeof options)[number] | null) => {
    setOptId(v?.id ?? null);
    setManual(true);
    const i = v ? gallery.indexOf(focusImage(v) ?? "") : 0;
    setIdx(i >= 0 ? i : 0);
  };
  const productId = String(product.id);
  const liked = mounted && has(productId);
  const toggleFavorite = () => toggle(productId);

  // Agregar al carrito y mostrar una confirmación visual.
  const handleAddToCart = (e: React.MouseEvent<HTMLElement>) => {
    if (soldOut || added) return;

    // Si tiene opciones (colores, tallas...) hay que elegir una en la ficha del producto.
    if (hasVariants(product)) return onOpen(product);

    // Si ya tiene en el carrito todas las unidades, no se agrega y se muestra el aviso.
    if (!add(product, e.currentTarget)) return;
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
      onMouseLeave={() => {
        setIdx(0);
        setManual(false);
        setOptId(null);
      }}
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
        <div className="relative">
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
              <div className="relative h-full w-full">
                {/* Fotos apiladas: se muestra la elegida con las flechas o con un color; con el cursor encima (sin haber elegido nada) se ve la segunda */}
                {gallery.map((src, i) => (
                  <SafeImage
                    key={src + i}
                    src={src}
                    alt={i === 0 ? product.name : ""}
                    className={`${i === 0 ? "relative" : "absolute inset-0"} h-full w-full object-cover transition-opacity duration-500 ease-out ${
                      i === idx ? "opacity-100" : idx === 0 && i === 1 && !manual ? "opacity-0 group-hover:opacity-100" : "opacity-0"
                    }`}
                  />
                ))}
              </div>
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
          {/* Flechas para pasar las fotos (solo si hay más de una): con el cursor encima, o siempre en pantallas táctiles */}
          {gallery.length > 1 && (
            <>
              {([-1, 1] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={(e) => step(e, d)}
                  aria-label={d === 1 ? "Foto siguiente" : "Foto anterior"}
                  className={`
                    absolute top-1/2 z-10 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full sm:h-9 sm:w-9
                    border border-white/20 bg-ink-950/60 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-md
                    opacity-0 transition duration-300 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden
                    hover:border-gold-300/40 hover:bg-ink-950/85 hover:text-gold-200
                    ${d === 1 ? "right-1.5 sm:right-3" : "left-1.5 sm:left-3"}
                  `}
                >
                  {d === 1 ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>
              ))}
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center [@media(hover:none)]:hidden">
                <div className="flex gap-1 rounded-full bg-ink-950/50 px-2 py-1 backdrop-blur-md">
                {gallery.map((_, i) => (
                  <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === idx ? "w-3 bg-gold-300" : "w-1 bg-white/40"}`} />
                ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Etiquetas: descuento y destacado */}
        {!soldOut && (onSale(product) || product.featured || isNew(product)) && (
          <div className="absolute left-2 top-2 z-10 flex flex-col items-start gap-1 sm:left-4 sm:top-4 sm:gap-1.5">
            <DiscountBadge product={product} />
            {product.featured && (
              <span
                className="
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
            {isNew(product) && (
              <span
                className="
                  rounded-full border border-white/25
                  bg-ink-950/55 px-2 py-1 sm:px-3 sm:py-1.5
                  text-[8px] font-medium uppercase sm:text-[9px]
                  tracking-[0.18em] text-white sm:tracking-[0.22em]
                  backdrop-blur-md
                "
              >
                Nuevo
              </span>
            )}
          </div>
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
            rounded-full border border-white/20
            bg-ink-950/60 shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-md
            transition-colors duration-300
            hover:border-gold-300/40 hover:bg-ink-950/75
          "
        >
          <Heart
            className={`h-3.5 w-3.5 transition-all duration-300 sm:h-4 sm:w-4 ${
              liked ? "fill-rose-gold text-rose-gold" : "text-white"
            }`}
          />
        </motion.button>

        {/* Ojito debajo del corazón: indica que la pieza se puede ver (abre la ficha) */}
        <button
          type="button"
          onClick={() => onOpen(product)}
          aria-label={`Ver ${product.name}`}
          className="
            absolute right-2 top-10 z-10 sm:right-4 sm:top-[3.75rem]
            flex h-8 w-8 items-center justify-center sm:h-10 sm:w-10
            rounded-full border border-white/20
            bg-ink-950/60 text-white shadow-[0_2px_10px_rgba(0,0,0,0.35)] backdrop-blur-md
            transition-colors duration-300
            hover:border-gold-300/40 hover:bg-ink-950/75 hover:text-gold-200
          "
        >
          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>

        {/* Información del producto */}
        <div className="flex items-end justify-between gap-2 p-3 sm:gap-3 sm:p-5">
          <div className="min-w-0">
            <h3
              className="
                line-clamp-2 min-h-[2.5em] font-serif text-[15px] leading-tight sm:line-clamp-1 sm:min-h-0 sm:text-2xl
                text-white transition-colors duration-500
                group-hover:text-gold-200
              "
            >
              {product.name}
            </h3>

            {options.length > 1 && !options.some((v) => v.color) && (
              <p className="mt-1.5 truncate text-[10px] uppercase tracking-[0.14em] text-white/45 sm:mt-2 sm:text-[11px]">
                {options.map((v) => v.name).join(" · ")}
              </p>
            )}
            {options.length > 1 && options.some((v) => v.color) && (
              <div className="mt-1.5 flex items-center gap-1 sm:mt-2" aria-label={product.variant_label || "Opciones"}>
                {options.slice(0, 5).map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    title={v.name + (isSoldOut(v) ? " (agotado)" : "")}
                    aria-label={v.name}
                    onClick={() => pick(optId === v.id ? null : v)}
                    onMouseEnter={() => pick(v)}
                    className={`h-3.5 w-3.5 rounded-full border transition sm:h-4 sm:w-4 ${
                      shownOpt?.id === v.id ? "border-gold-300 ring-1 ring-gold-300/60" : "border-white/30"
                    } ${isSoldOut(v) ? "opacity-40" : ""}`}
                    style={{ background: v.color || "#8a8a8a" }}
                  />
                ))}
                {options.length > 5 && <span className="text-[10px] text-white/45">+{options.length - 5}</span>}
              </div>
            )}

            <p className="mt-0.5 truncate text-[11px] text-white/45 sm:mt-1 sm:text-sm">
              {product.material}
            </p>

            <div className="mt-1.5 sm:mt-3">
              <Price product={product} className="text-base sm:text-xl" />
            </div>
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