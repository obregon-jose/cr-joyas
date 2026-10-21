"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { TOAST_EVENT, ToastDetail, ToastKind } from "@/lib/ui/toast";

type Item = { id: number; text: string; kind: ToastKind };

const MAX = 4;
const DURATION: Record<ToastKind, number> = { success: 3500, info: 4500, error: 6500 };

const ICON = {
  success: <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />,
  error: <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-gold" />,
  info: <Info className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />,
} as const;

const BORDER: Record<ToastKind, string> = {
  success: "border-emerald-400/30",
  error: "border-rose-gold/50",
  info: "border-gold-400/40",
};

/** Un solo contenedor para todo el sitio: se monta una vez en el layout. */
export default function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  const idRef = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = (id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((l) => l.filter((x) => x.id !== id));
  };

  useEffect(() => {
    const map = timers.current;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail;
      if (!d?.text) return;
      const id = ++idRef.current;
      // Si llega el mismo mensaje seguido, no se apila: se reemplaza.
      setItems((l) => [...l.filter((x) => x.text !== d.text), { id, text: d.text, kind: d.kind }].slice(-MAX));
      map.set(id, window.setTimeout(() => dismiss(id), d.ms ?? DURATION[d.kind]));
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast);
      map.forEach((t) => window.clearTimeout(t));
      map.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-[200] mx-auto flex max-w-sm flex-col items-stretch gap-2 sm:bottom-8"
    >
      <AnimatePresence initial={false}>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.kind === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-ink-900/95 p-4 text-sm text-white/85 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur ${BORDER[t.kind]}`}
          >
            {ICON[t.kind]}
            <p className="min-w-0 flex-1 break-words">{t.text}</p>
            <button onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="-m-1 rounded-full p-1 text-white/35 transition hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}