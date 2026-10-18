"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Faq = {
  id: string;
  topic: string;
  question: string;
  answer: string;
  position: number;
  active: boolean;
};

// Temas en el orden en que se muestran como pestañas.
export const FAQ_TOPICS = ["Pedidos y pagos", "Envíos", "Cuidado y garantía", "Tallas y personalización"];

// Se usan solo si la tabla aún no existe (migración 012); después, todo se edita desde el panel.
const DEFAULTS: [string, string, string][] = [
  ["Pedidos y pagos", "¿Cómo hago un pedido?", "Agrega tus piezas al carrito, toca Continuar y llena tus datos de envío. Recibirás un número de pedido y podrás enviárnoslo por WhatsApp para coordinar el pago."],
  ["Envíos", "¿Cuánto tarda y cuánto cuesta el envío?", "El tiempo y el costo dependen de tu ciudad. Te los confirmamos por WhatsApp cuando recibimos tu pedido, antes de que pagues."],
  ["Cuidado y garantía", "¿Cómo cuido mis joyas?", "Guárdalas por separado, evita el contacto con perfumes, cremas y agua de mar, y límpialas con un paño suave y seco."],
  ["Tallas y personalización", "¿Cómo sé cuál es mi talla de anillo?", "Rodea con un hilo el dedo donde usarás el anillo, mide su largo en milímetros y escríbenos la medida: te ayudamos a elegir la talla."],
];
export const DEFAULT_FAQS: Faq[] = DEFAULTS.map(([topic, question, answer], i) => ({
  id: `d${i}`, topic, question, answer, position: i + 1, active: true,
}));

/** Preguntas visibles, en orden. Si la tabla no existe todavía, devuelve las de ejemplo. */
export function useFaqs() {
  const [faqs, setFaqs] = useState<Faq[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (!supabase) {
      setFaqs(DEFAULT_FAQS);
      return;
    }
    supabase
      .from("faqs")
      .select("*")
      .eq("active", true)
      .order("position", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        setFaqs(error || !data ? DEFAULT_FAQS : (data as Faq[]));
      });
    return () => {
      alive = false;
    };
  }, []);

  return faqs;
}

/** Temas presentes, primero los conocidos y luego cualquier otro. */
export function topicsOf(faqs: Faq[]): string[] {
  const present = Array.from(new Set(faqs.map((f) => f.topic)));
  return [...FAQ_TOPICS.filter((t) => present.includes(t)), ...present.filter((t) => !FAQ_TOPICS.includes(t))];
}