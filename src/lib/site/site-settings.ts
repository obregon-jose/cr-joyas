"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type SiteSettings = {
  // Marca
  brand_name: string;
  footer_text: string;
  // Contacto
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  // Hero
  hero_eyebrow: string;
  hero_title: string; // las palabras entre *asteriscos* salen en dorado
  hero_text: string;
  hero_image: string;
  hero_ring_text: string; // texto que gira en el anillo dorado; vacío = sin anillo
  hero_cta1: string;
  hero_cta2: string;
  // Cinta de beneficios que se desplaza bajo el hero; lista vacía = sin cinta
  marquee_items: string[];
};

export const MARQUEE_MAX = 10;
export const MARQUEE_ITEM_MAX = 60;

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "CR Joyas",
  footer_text: "CR Joyas. Todos los derechos reservados.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "573001234567",
  phone: "+57 300 123 4567",
  email: "hola@aureliajoyeria.co",
  address: "Cali, Valle del Cauca · Colombia",
  hours: "Lun – Sáb · 10:00 a 19:00",
  instagram: "",
  hero_eyebrow: "Colección Otoño 2026",
  hero_title: "Brillo que *cuenta* tu *historia*",
  hero_text:
    "Piezas únicas de alta joyería colombiana, forjadas a mano en oro de 18 quilates con diamantes y esmeraldas seleccionadas una a una.",
  hero_image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1800&q=80",
  hero_ring_text: "Oro 18k · Diamantes · Esmeraldas",
  hero_cta1: "Explorar catálogo",
  hero_cta2: "Nuestro atelier",
  marquee_items: [
    "Envío asegurado a todo el país",
    "Certificado de autenticidad",
    "Oro 18k colombiano",
    "Garantía de por vida",
    "Empaque de regalo de lujo",
    "Grabado personalizado",
  ],
};

// Estos campos pueden quedar vacíos a propósito (se ocultan en el sitio).
const OPTIONAL: (keyof SiteSettings)[] = ["instagram", "phone", "email", "address", "hours", "hero_ring_text"];

/** Quita vacíos y espacios sobrantes y respeta los límites de la cinta. */
export function cleanMarquee(list: unknown[]): string[] {
  return list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.replace(/\s+/g, " ").trim().slice(0, MARQUEE_ITEM_MAX))
    .filter(Boolean)
    .slice(0, MARQUEE_MAX);
}

function merge(stored: unknown): SiteSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== "object") return out;
  const raw = stored as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    if (key === "marquee_items") continue;
    const v = raw[key];
    if (typeof v !== "string") continue;
    if (v.trim() !== "" || OPTIONAL.includes(key)) (out as Record<string, unknown>)[key] = v;
  }
  // La cinta es una lista: si se guardó (aunque quede vacía) manda lo guardado; si nunca se guardó, los valores por defecto.
  if (Array.isArray(raw.marquee_items)) out.marquee_items = cleanMarquee(raw.marquee_items);
  return out;
}

let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;
const listeners = new Set<(s: SiteSettings) => void>();

/** Lee la configuración desde Supabase; si la tabla no existe aún, usa los valores por defecto. */
export async function loadSettings(force = false): Promise<SiteSettings> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;
  inflight = (async () => {
    let result = DEFAULT_SETTINGS;
    if (supabase) {
      const { data, error } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
      if (!error && data) result = merge(data.data);
    }
    cache = result;
    inflight = null;
    return result;
  })();
  return inflight;
}

/** Avisa a todos los componentes que la configuración cambió (después de guardar). */
export function publishSettings(next: SiteSettings) {
  cache = next;
  listeners.forEach((fn) => fn(next));
}

export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? DEFAULT_SETTINGS);
  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => alive && setSettings(s));
    listeners.add(setSettings);
    return () => {
      alive = false;
      listeners.delete(setSettings);
    };
  }, []);
  return settings;
}

/**
 * Texto del anillo del hero: se repite las veces necesarias para dar la vuelta completa al círculo,
 * así queda parejo sin importar si el admin escribe una palabra o tres.
 */
export function ringText(raw: string): string {
  const base = raw.replace(/\s+/g, " ").trim().toUpperCase();
  if (!base) return "";
  const unit = `${base} · `;
  const times = Math.max(1, Math.round(58 / unit.length));
  return unit.repeat(times).trimEnd();
}

/** Enlace de WhatsApp a partir de cualquier formato de número. */
export function waLink(number: string, text?: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** "Brillo que *cuenta*" → [{ word: "Brillo", gold: false }, { word: "cuenta", gold: true }] */
export function parseTitle(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      const gold = w.startsWith("*") && w.endsWith("*") && w.length > 2;
      return { word: gold ? w.slice(1, -1) : w.replace(/\*/g, ""), gold };
    });
}