"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Heart, Link2, Minus, Plus, MessageCircle, Quote, ShieldCheck, ShoppingBag, Truck, Gem } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppFab from "@/components/layout/WhatsAppFab";
import CartDrawer from "@/components/cart/CartDrawer";
import FloatingCart from "@/components/cart/FloatingCart";
import ZoomGallery from "@/components/catalog/ZoomGallery";
import ProductCard from "@/components/catalog/ProductCard";
import Price, { DiscountBadge } from "@/components/catalog/Price";
import ReviewDetail from "@/components/reviews/ReviewDetail";
import Reveal from "@/components/ui/Reveal";
import { StarsDisplay } from "@/components/ui/StarRating";
import { supabase } from "@/lib/supabase";
import { Product } from "@/lib/types";
import { useCart } from "@/lib/cart/cart";
import { useFavorites } from "@/lib/catalog/favorites";
import { getImages } from "@/lib/catalog/images";
import { productPath } from "@/lib/catalog/product-url";
import { useProducts } from "@/lib/catalog/use-products";
import { PublicReview, summarize, usePublicReviews } from "@/lib/reviews/reviews";
import { useSiteSettings, waLink } from "@/lib/site/site-settings";
import { toast } from "@/lib/ui/toast";

const PAGE = 8; // piezas que se muestran de golpe al final de la ficha
const REVIEWS_SHOWN = 6;

/** Reseñas de la pieza con el mismo estilo del carrusel del inicio: un testimonio a la vez. */
function ProductReviews({ reviews, onOpen }: { reviews: PublicReview[]; onOpen: (i: number) => void }) {
  const [i, setI] = useState(0);
  const [hover, setHover] = useState(false);
  const n = reviews.length;
  const cur = reviews[Math.min(i, n - 1)];

  useEffect(() => {
    if (n < 2 || hover) return;
    const t = setInterval(() => setI((v) => (v + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, hover]);

  return (
    <div className="mx-auto max-w-3xl text-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <Quote className="mx-auto mb-5 h-9 w-9 text-gold-500/60" strokeWidth={1} />
      <div className="relative min-h-[220px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.id}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -24, filter: "blur(6px)" }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-5 flex justify-center">
              <StarsDisplay value={cur.rating} size={20} />
            </div>
            <p className="font-serif text-xl italic leading-relaxed md:text-2xl">“{cur.comment}”</p>
            {cur.images.length > 0 && (
              <div className="mt-6 flex justify-center gap-2.5">
                {cur.images.slice(0, 4).map((src, k) => (
                  <button
                    key={src}
                    onClick={() => onOpen(i)}
                    aria-label={`Ver foto ${k + 1} de la reseña`}
                    className="group relative h-14 w-14 overflow-hidden rounded-lg border border-gold-400/30 transition hover:border-gold-300 sm:h-16 sm:w-16"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                    {k === 3 && cur.images.length > 4 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-xs text-white">+{cur.images.length - 4}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="mt-6 text-sm uppercase tracking-[0.3em] text-gold-300">{cur.customer_name}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      {n > 1 && (
        <div className="mt-8 flex justify-center gap-3">
          {reviews.map((r, d) => (
            <button
              key={r.id}
              onClick={() => setI(d)}
              aria-label={`Reseña ${d + 1}`}
              className="relative h-2 overflow-hidden rounded-full bg-white/15 transition-all"
              style={{ width: d === i ? 40 : 8 }}
            >
              {d === i && <motion.span layoutId="prod-dot" className="absolute inset-0 bg-gold-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductPage({ initial }: { initial: Product }) {
  const router = useRouter();
  const site = useSiteSettings();
  const { add, buyNow, items } = useCart();
  const { has, toggle, ready: favReady } = useFavorites();
  const [qty, setQty] = useState(1);
  const [qtyTouched, setQtyTouched] = useState(false);
  const { products } = useProducts();
  const { reviews } = usePublicReviews();

  // La página se genera en el servidor (para Google y redes), pero el precio y el stock se vuelven a leer al abrir.
  const [product, setProduct] = useState<Product>(initial);
  const [gone, setGone] = useState(false);
  const [detail, setDetail] = useState<number | null>(null);
  const [url, setUrl] = useState(""); // se conoce solo en el navegador
  useEffect(() => setUrl(window.location.href), []);

  useEffect(() => {
    setQty(1);
    setQtyTouched(false);
    setProduct(initial);
    setGone(false);
  }, [initial]);

  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    supabase
      .from("products")
      .select("*")
      .eq("id", initial.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!alive || error) return;
        if (!data) return; // puede ser un producto de ejemplo
        const p = data as Product;
        if (p.active === false) setGone(true);
        else setProduct({ ...p, images: getImages(p) });
      });
    return () => {
      alive = false;
    };
  }, [initial.id]);

  const images = useMemo(() => getImages(product), [product]);
  const soldOut = product.stock <= 0;
  const liked = favReady && has(String(product.id));
  const inCart = items.find((i) => i.product.id === product.id)?.qty ?? 0;
  const maxQty = Math.max(1, product.stock - inCart); // lo que aún se puede sumar
  const shownQty = Math.min(qty, maxQty);
  const rating = summarize(reviews, product.id);
  const mine = useMemo(() => reviews.filter((r) => r.product_id === product.id), [reviews, product.id]);

  // Todo el catálogo para seguir viendo sin volver atrás: primero las de la misma categoría.
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [product.id]);
  const others = useMemo(() => {
    const rest = products.filter((p) => p.id !== product.id);
    return [...rest.filter((p) => p.category === product.category), ...rest.filter((p) => p.category !== product.category)];
  }, [products, product.id, product.category]);

  // Precarga las fichas de "Sigue explorando" para que al tocar una se abra sin esperar.
  useEffect(() => {
    const t = window.setTimeout(() => others.slice(0, 8).forEach((p) => router.prefetch(productPath(p))), 800);
    return () => window.clearTimeout(t);
  }, [others, router]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Enlace copiado ✓");
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return; // el usuario cerró el menú de compartir
      toast.error("No pudimos copiar el enlace. Cópialo desde la barra de direcciones.");
    }
  };

  const ask = waLink(site.whatsapp, `Hola, me interesa "${product.name}". ${url}`.trim());

  return (
    <main className="relative min-h-screen">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
        <nav aria-label="Ruta" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-white/40">
          <Link href="/" className="transition hover:text-gold-200">Inicio</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/#catalogo" className="transition hover:text-gold-200">Catálogo</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/?categoria=${encodeURIComponent(product.category)}#catalogo`} className="transition hover:text-gold-200">
            {product.category}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-white/70">{product.name}</span>
        </nav>

        {gone && (
          <p className="mb-6 rounded-2xl border border-gold-400/30 bg-ink-900 p-4 text-sm text-white/70">
            Esta pieza ya no está disponible en la tienda. Mira el resto del catálogo más abajo.
          </p>
        )}

        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <ZoomGallery key={product.id} images={images} alt={product.name} />
          </div>

          <div className="flex flex-col gap-5">
            <p className="eyebrow">{product.category}</p>
            <h1 className="font-serif text-4xl leading-tight sm:text-5xl">{product.name}</h1>

            {rating.count > 0 && (
              <a href="#resenas" className="flex w-fit items-center gap-2 text-sm text-white/50 transition hover:text-gold-200">
                <StarsDisplay value={rating.average} size={18} /> ({rating.count} {rating.count === 1 ? "reseña" : "reseñas"})
              </a>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Price product={product} className="text-4xl sm:text-5xl" />
              <DiscountBadge product={product} />
            </div>

            {product.description && <p className="whitespace-pre-line leading-relaxed text-white/65">{product.description}</p>}

            <dl className="grid grid-cols-2 gap-4 border-y border-white/10 py-5 text-sm">
              <div>
                <dt className="text-white/40">Material</dt>
                <dd className="mt-1 text-gold-100">{product.material || "—"}</dd>
              </div>
              <div>
                <dt className="text-white/40">Disponibilidad</dt>
                <dd className={`mt-1 ${soldOut ? "text-rose-gold" : product.stock <= 3 ? "text-gold-300" : "text-gold-100"}`}>
                  {soldOut ? "Agotado" : product.stock <= 3 ? `¡Quedan solo ${product.stock}!` : "Disponible"}
                </dd>
              </div>
            </dl>

            {!soldOut && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="text-sm text-white/50">Cantidad</span>
                <div className="flex items-center rounded-full border border-white/15">
                  <button
                    type="button"
                    aria-label="Menos unidades"
                    disabled={shownQty <= 1}
                    onClick={() => { setQty(shownQty - 1); setQtyTouched(true); }}
                    className="flex h-10 w-10 items-center justify-center text-white/70 transition hover:text-gold-200 disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span aria-live="polite" className="w-8 text-center text-sm tabular-nums text-gold-100">{shownQty}</span>
                  <button
                    type="button"
                    aria-label="Más unidades"
                    disabled={shownQty >= maxQty}
                    onClick={() => { setQty(shownQty + 1); setQtyTouched(true); }}
                    className="flex h-10 w-10 items-center justify-center text-white/70 transition hover:text-gold-200 disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {inCart > 0 && (
                  <span className="text-xs text-white/40">
                    Ya tienes {inCart} en el carrito{shownQty >= maxQty && maxQty === 1 && inCart >= product.stock ? " (máximo disponible)" : ""}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col 2xl:flex-row">
              <button
                disabled={soldOut || gone}
                onClick={(e) => {
                  if (add(product, e.currentTarget, shownQty)) { setQty(1); setQtyTouched(false); }
                }}
                className="btn-gold flex-1 disabled:opacity-40"
              >
                <ShoppingBag className="h-4 w-4" />{" "}
                {soldOut ? "Agotado" : shownQty > 1 ? `Agregar ${shownQty} al carrito` : "Agregar al carrito"}
              </button>
              <button
                disabled={soldOut || gone}
                onClick={() => buyNow(product, qtyTouched ? shownQty : undefined)}
                className="btn-ghost flex-1 disabled:opacity-40"
              >
                Comprar ahora
              </button>
              <button
                type="button"
                onClick={() => toggle(String(product.id))}
                aria-pressed={liked}
                aria-label={liked ? "Quitar de favoritos" : "Agregar a favoritos"}
                className="btn-ghost flex items-center justify-center gap-2 sm:w-auto"
              >
                <Heart className={`h-4 w-4 transition ${liked ? "fill-rose-gold text-rose-gold" : ""}`} />
                <span>{liked ? "En favoritos" : "Favoritos"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href={ask} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/65 transition hover:border-gold-300/50 hover:text-gold-200">
                <MessageCircle className="h-4 w-4" /> Preguntar por WhatsApp
              </a>
              <button onClick={share} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/65 transition hover:border-gold-300/50 hover:text-gold-200">
                <Link2 className="h-4 w-4" /> Compartir
              </button>
            </div>

            <ul className="grid gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-5 text-sm text-white/60 sm:grid-cols-3">
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 shrink-0 text-gold-400" /> Envío asegurado</li>
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-gold-400" /> Certificado incluido</li>
              <li className="flex items-center gap-2"><Gem className="h-4 w-4 shrink-0 text-gold-400" /> Hecha a mano</li>
            </ul>
          </div>
        </div>

        {mine.length > 0 && (
          <section id="resenas" className="mt-24 scroll-mt-28">
            <Reveal>
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">Opiniones</p>
                  <h2 className="font-serif text-3xl sm:text-4xl">Lo que dicen de esta pieza</h2>
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <StarsDisplay value={rating.average} size={18} /> {rating.average.toFixed(1)} · {rating.count} {rating.count === 1 ? "reseña" : "reseñas"}
                </div>
              </div>
            </Reveal>
            <ProductReviews reviews={mine.slice(0, REVIEWS_SHOWN)} onOpen={setDetail} />
            <ReviewDetail reviews={mine.slice(0, REVIEWS_SHOWN)} index={detail} onChange={setDetail} onClose={() => setDetail(null)} />
          </section>
        )}

        {others.length > 0 && (
          <section className="mt-24">
            <Reveal>
              <div className="mb-8 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">Seguir viendo</p>
                  <h2 className="font-serif text-3xl sm:text-4xl">Sigue explorando</h2>
                </div>
                <Link href="/#catalogo" className="text-sm text-gold-300 transition hover:text-gold-200">Ver el catálogo con filtros</Link>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
              {others.slice(0, shown).map((p) => (
                <ProductCard key={p.id} product={p} onOpen={() => router.push(productPath(p))} />
              ))}
            </div>
            {shown < others.length && (
              <div className="mt-10 text-center">
                <button onClick={() => setShown((n) => n + PAGE)} className="btn-ghost">
                  Ver más piezas ({others.length - shown})
                </button>
              </div>
            )}
          </section>
        )}
      </div>

      <Footer />
      <CartDrawer />
      <WhatsAppFab />
      <FloatingCart />
    </main>
  );
}