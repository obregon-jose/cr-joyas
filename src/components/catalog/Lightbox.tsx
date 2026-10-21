"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";

type Props = { images: string[]; start: number; alt: string; onClose: () => void };

const MIN = 1;
const MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * Visor a pantalla completa con zoom real: rueda del mouse, botones +/−, pellizco en el celular,
 * doble clic/toque para acercar, arrastrar para mover la foto y flechas/teclado para cambiar de imagen.
 */
export default function Lightbox({ images, start, alt, onClose }: Props) {
  const [index, setIndex] = useState(start);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  const stage = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; s: number; sx: number; sy: number; vx: number; vy: number; moved: boolean }>({
    dist: 0, s: 1, sx: 0, sy: 0, vx: 0, vy: 0, moved: false,
  });
  const lastTap = useRef(0);
  const count = images.length;

  useEffect(() => setMounted(true), []);

  // El visor bloquea el scroll de la página mientras está abierto.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  /** Limita el desplazamiento para que la foto no se salga de la pantalla. */
  const bound = useCallback((s: number, x: number, y: number) => {
    const el = img.current;
    const st = stage.current;
    if (!el || !st) return { s, x, y };
    const maxX = Math.max(0, (el.offsetWidth * s - st.clientWidth) / 2);
    const maxY = Math.max(0, (el.offsetHeight * s - st.clientHeight) / 2);
    return { s, x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }, []);

  /** Cambia el zoom manteniendo fijo el punto (cx, cy) medido desde el centro del visor. */
  const zoomAt = useCallback(
    (next: number, cx = 0, cy = 0) =>
      setView((v) => {
        const s = clamp(next, MIN, MAX);
        if (s === MIN) return { s, x: 0, y: 0 };
        const k = s / v.s;
        return bound(s, cx - (cx - v.x) * k, cy - (cy - v.y) * k);
      }),
    [bound]
  );

  const reset = useCallback(() => setView({ s: 1, x: 0, y: 0 }), []);
  const go = useCallback(
    (step: number) => {
      setIndex((i) => (i + step + count) % count);
      reset();
    },
    [count, reset]
  );

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && count > 1) go(-1);
      else if (e.key === "ArrowRight" && count > 1) go(1);
      else if (e.key === "+" || e.key === "=") zoomAt(view.s * 1.5);
      else if (e.key === "-") zoomAt(view.s / 1.5);
      else if (e.key === "0") reset();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose, go, zoomAt, reset, count, view.s]);

  // La rueda se registra a mano para poder evitar que la página haga scroll.
  useEffect(() => {
    const st = stage.current;
    if (!st) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = st.getBoundingClientRect();
      const cx = e.clientX - (r.left + r.width / 2);
      const cy = e.clientY - (r.top + r.height / 2);
      setView((v) => {
        const s = clamp(v.s * Math.exp(-e.deltaY * 0.0022), MIN, MAX);
        if (s === MIN) return { s, x: 0, y: 0 };
        const k = s / v.s;
        return bound(s, cx - (cx - v.x) * k, cy - (cy - v.y) * k);
      });
    };
    st.addEventListener("wheel", onWheel, { passive: false });
    return () => st.removeEventListener("wheel", onWheel);
  }, [bound, mounted]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    g.moved = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      g.dist = Math.hypot(a.x - b.x, a.y - b.y);
      g.s = view.s;
    } else {
      g.sx = e.clientX;
      g.sy = e.clientY;
      g.vx = view.x;
      g.vy = view.y;
    }
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.dist > 0) {
        const st = stage.current!.getBoundingClientRect();
        const cx = (a.x + b.x) / 2 - (st.left + st.width / 2);
        const cy = (a.y + b.y) / 2 - (st.top + st.height / 2);
        const s = clamp(g.s * (d / g.dist), MIN, MAX);
        setView((v) => {
          if (s === MIN) return { s, x: 0, y: 0 };
          const k = s / v.s;
          return bound(s, cx - (cx - v.x) * k, cy - (cy - v.y) * k);
        });
      }
      g.moved = true;
      return;
    }
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;
    if (view.s > 1) setView((v) => bound(v.s, g.vx + dx, g.vy + dy));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const had = pointers.current.delete(e.pointerId);
    if (!had) return;
    const g = gesture.current;
    if (pointers.current.size === 1) {
      // Terminó un pellizco: el dedo que queda sigue moviendo la foto desde donde está.
      const [p] = [...pointers.current.values()];
      g.sx = p.x;
      g.sy = p.y;
      g.vx = view.x;
      g.vy = view.y;
      return;
    }
    if (pointers.current.size > 0) return;
    setDragging(false);

    const dx = e.clientX - g.sx;
    if (!g.moved) {
      // Toque simple: doble toque acerca o aleja; si se tocó fuera de la foto, cierra.
      const now = Date.now();
      if (now - lastTap.current < 300) {
        const r = stage.current!.getBoundingClientRect();
        zoomAt(view.s > 1 ? 1 : 2.5, e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        lastTap.current = 0;
      } else {
        lastTap.current = now;
        const el = img.current?.getBoundingClientRect();
        const outside = el && (e.clientX < el.left || e.clientX > el.right || e.clientY < el.top || e.clientY > el.bottom);
        if (outside && view.s === 1) onClose();
      }
    } else if (view.s === 1 && count > 1 && Math.abs(dx) > 60) {
      go(dx < 0 ? 1 : -1); // deslizar sin zoom cambia de imagen
    }
  };

  if (!mounted) return null;

  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-ink-900/70 text-white/80 backdrop-blur transition hover:border-gold-300/60 hover:text-gold-300 disabled:opacity-30";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Imágenes de ${alt}`} className="fixed inset-0 z-[150] flex flex-col bg-ink-950/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="rounded-full bg-ink-900/70 px-3 py-1 text-xs tracking-widest text-white/70">
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoomAt(view.s / 1.5)} disabled={view.s <= MIN} aria-label="Alejar" className={btn}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="hidden w-12 text-center text-xs text-white/50 sm:block">{Math.round(view.s * 100)}%</span>
          <button type="button" onClick={() => zoomAt(view.s * 1.5)} disabled={view.s >= MAX} aria-label="Acercar" className={btn}>
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" onClick={reset} disabled={view.s === 1} aria-label="Restablecer zoom" className={btn}>
            <RotateCcw className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} aria-label="Cerrar" autoFocus className={`${btn} ml-2`}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden ${view.s > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={img}
          key={index}
          src={images[index]}
          alt={`${alt} · imagen ${index + 1}`}
          draggable={false}
          onLoad={() => setView((v) => bound(v.s, v.x, v.y))}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
            transition: dragging ? "none" : "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
          }}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain will-change-transform"
        />

        {count > 1 && (
          <>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} onPointerDown={(e) => e.stopPropagation()} aria-label="Imagen anterior" className={`${btn} absolute left-3 top-1/2 -translate-y-1/2`}>
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} onPointerDown={(e) => e.stopPropagation()} aria-label="Imagen siguiente" className={`${btn} absolute right-3 top-1/2 -translate-y-1/2`}>
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              onClick={() => {
                setIndex(i);
                reset();
              }}
              aria-label={`Ver imagen ${i + 1}`}
              className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${i === index ? "border-gold-300" : "border-white/15 opacity-60 hover:opacity-100"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      <p className="pb-3 text-center text-[11px] tracking-wide text-white/30">
        Rueda o pellizca para acercar · doble toque para ampliar · arrastra para mover
      </p>
    </div>,
    document.body
  );
}