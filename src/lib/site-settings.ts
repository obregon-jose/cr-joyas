"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

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
  hero_cta1: string;
  hero_cta2: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "CR JOYAS",
  footer_text: "CR Joyas. Todos los derechos reservados.",
  whatsapp: "573001234567",
  phone: "+57 300 123 4567",
  email: "hola@aureliajoyeria.co",
  address: "Cali, Valle del Cauca · Colombia",
  hours: "Lun – Sáb · 10:00 a 19:00",
  instagram: "",
  hero_eyebrow: "Eleva tu esencia",
  hero_title: "Brillo que *cuenta* tu *historia*",
  hero_text:
    "Piezas únicas de alta joyería colombiana, forjadas a mano en oro de 18 quilates con diamantes y esmeraldas seleccionadas una a una.",
  hero_image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1800&q=80",
  hero_cta1: "Explorar catálogo",
  hero_cta2: "Nuestro atelier",
};

// Estos campos pueden quedar vacíos a propósito (se ocultan en el sitio).
const OPTIONAL: (keyof SiteSettings)[] = ["instagram", "phone", "email", "address", "hours"];

function merge(stored: unknown): SiteSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== "object") return out;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    const v = (stored as Record<string, unknown>)[key];
    if (typeof v !== "string") continue;
    if (v.trim() !== "" || OPTIONAL.includes(key)) out[key] = v;
  }
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