"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import SafeImage from "@/components/ui/SafeImage";
import Lightbox from "@/components/catalog/Lightbox";

type Props = { images: string[]; alt: string; /** Foto a enfocar (por ejemplo, la del color elegido); la galería sigue mostrando todas. */ focus?: string | null };

const ZOOM = 2.4; // aumento al pasar el cursor

/**
 * Galería de la ficha de producto:
 *  · en computador, al pasar el cursor la foto se amplía siguiendo el mouse;
 *  · al hacer clic/tocar se abre el visor a pantalla completa con zoom, pellizco y arrastre;
 *  · en el celular se desliza para cambiar de foto.
 */
export default function ZoomGallery({ images, alt, focus }: Props) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const down = useRef<{ x: number; y: number } | null>(null);
  const count = images.length;

  // Al elegir una opción se salta a su foto, sin quitar las demás.
  useEffect(() => {
    const i = focus ? images.indexOf(focus) : -1;
    if (i >= 0) setIndex(i);
  }, [focus, images]);

  // Si cambian las fotos del producto (por ejemplo, al refrescar los datos), no se queda un índice inexistente.
  useEffect(() => setIndex((i) => Math.min(i, Math.max(0, count - 1))), [count]);

  // Precarga las demás fotos para que el cambio sea inmediato.
  useEffect(() => {
    images.forEach((src) => {
      const im = new Image();
      im.src = src;
    });
  }, [images]);

  const go = (step: number) => setIndex((i) => (i + step + count) % count);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  const arrow =
    "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-ink-950/60 p-2.5 text-white/80 opacity-0 backdrop-blur transition hover:border-gold-300/60 hover:text-gold-300 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100";

  if (count === 0) {
    return <div className="aspect-square w-full rounded-3xl border border-white/10 bg-ink-800" />;
  }

  return (
    <div className="space-y-3">
      <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-ink-800">
        <div
          role="button"
          tabIndex={0}
          aria-label="Ampliar imagen"
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(true))}
          onPointerEnter={onMove}
          onPointerMove={onMove}
          onPointerLeave={() => setZoom(null)}
          onPointerDown={(e) => (down.current = { x: e.clientX, y: e.clientY })}
          onPointerUp={(e) => {
            const d = down.current;
            down.current = null;
            if (!d) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 50 && count > 1 && Math.abs(dx) > Math.abs(e.clientY - d.y)) go(dx < 0 ? 1 : -1);
            else if (Math.abs(dx) < 8 && Math.abs(e.clientY - d.y) < 8) setOpen(true);
          }}
          className={`relative aspect-square w-full touch-pan-y overflow-hidden md:aspect-[4/5] ${zoom ? "cursor-zoom-in" : "cursor-pointer"}`}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0"
            >
              <div
                className="h-full w-full"
                style={{
                  transform: zoom ? `scale(${ZOOM})` : "scale(1)",
                  transformOrigin: zoom ? `${zoom.x}% ${zoom.y}%` : "50% 50%",
                  transition: zoom ? "transform 0.18s ease-out" : "transform 0.35s ease-out",
                }}
              >
                <SafeImage src={images[index]} alt={`${alt} · imagen ${index + 1}`} priority className="h-full w-full select-none object-cover" />
              </div>
            </motion.div>
          </AnimatePresence>

          <span className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-ink-950/65 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur">
            <Maximize2 className="h-3.5 w-3.5" /> <span className="hidden md:inline">Toca para ampliar</span>
            <span className="md:hidden">Ampliar</span>
          </span>
          {count > 1 && (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink-950/65 px-3 py-1 text-xs tracking-widest text-white/70 backdrop-blur">
              {index + 1} / {count}
            </span>
          )}
        </div>

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Imagen anterior" className={`${arrow} left-3`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Imagen siguiente" className={`${arrow} right-3`}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Ver imagen ${i + 1}`}
              aria-current={i === index}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition sm:h-20 sm:w-20 ${
                i === index ? "border-gold-300" : "border-white/10 opacity-60 hover:opacity-100"
              }`}
            >
              <SafeImage src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && <Lightbox images={images} start={index} alt={alt} onClose={() => setOpen(false)} />}
    </div>
  );
}