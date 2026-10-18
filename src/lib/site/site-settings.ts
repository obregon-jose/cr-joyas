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
  // Atelier
  atelier_eyebrow: string;
  atelier_title: string; // las palabras entre *asteriscos* salen en dorado
  atelier_text: string;
  atelier_image1: string; // foto grande de arriba a la izquierda
  atelier_image2: string; // foto de abajo a la derecha
  atelier_badge: string; // texto del sello giratorio; vacío = sin sello
  atelier_stats: AtelierStat[]; // cifras animadas; lista vacía = sin cifras
};

export type AtelierStat = { value: number; suffix: string; label: string };

export const MARQUEE_MAX = 10;
export const MARQUEE_ITEM_MAX = 60;
export const STATS_MAX = 4;
export const STAT_LABEL_MAX = 40;
export const STAT_SUFFIX_MAX = 3;
export const STAT_VALUE_MAX = 99999999;

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
  atelier_eyebrow: "Nuestro atelier",
  atelier_title: "Cada joya, una *obra de arte*",
  atelier_text:
    "En nuestro taller de Cali, maestros orfebres transforman oro, diamantes y esmeraldas colombianas en piezas que acompañan los momentos más importantes de la vida. Diseñamos, fundimos, engastamos y pulimos cada detalle a mano.",
  atelier_image1: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=900&q=80",
  atelier_image2: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=900&q=80",
  atelier_badge: "Hecho a mano",
  atelier_stats: [
    { value: 25, suffix: "+", label: "Años de maestría" },
    { value: 12000, suffix: "+", label: "Clientes felices" },
    { value: 100, suffix: "%", label: "Oro 18k certificado" },
    { value: 340, suffix: "", label: "Piezas únicas al año" },
  ],
};

// Estos campos pueden quedar vacíos a propósito (se ocultan en el sitio).
const OPTIONAL: (keyof SiteSettings)[] = ["instagram", "phone", "email", "address", "hours", "hero_ring_text", "atelier_badge"];

/** Quita vacíos y espacios sobrantes y respeta los límites de la cinta. */
export function cleanMarquee(list: unknown[]): string[] {
  return list
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.replace(/\s+/g, " ").trim().slice(0, MARQUEE_ITEM_MAX))
    .filter(Boolean)
    .slice(0, MARQUEE_MAX);
}

/** Limpia las cifras del atelier: sin etiquetas vacías, números válidos y límites de tamaño. */
export function cleanStats(list: unknown[]): AtelierStat[] {
  const out: AtelierStat[] = [];
  for (const x of list) {
    if (!x || typeof x !== "object") continue;
    const r = x as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.replace(/\s+/g, " ").trim().slice(0, STAT_LABEL_MAX) : "";
    const num = Math.round(Number(r.value));
    if (!label || !Number.isFinite(num)) continue;
    out.push({
      value: Math.min(Math.max(num, 0), STAT_VALUE_MAX),
      suffix: typeof r.suffix === "string" ? r.suffix.trim().slice(0, STAT_SUFFIX_MAX) : "",
      label,
    });
  }
  return out.slice(0, STATS_MAX);
}

function merge(stored: unknown): SiteSettings {
  const out = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== "object") return out;
  const raw = stored as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    if (key === "marquee_items" || key === "atelier_stats") continue;
    const v = raw[key];
    if (typeof v !== "string") continue;
    if (v.trim() !== "" || OPTIONAL.includes(key)) (out as Record<string, unknown>)[key] = v;
  }
  // La cinta es una lista: si se guardó (aunque quede vacía) manda lo guardado; si nunca se guardó, los valores por defecto.
  if (Array.isArray(raw.marquee_items)) out.marquee_items = cleanMarquee(raw.marquee_items);
  if (Array.isArray(raw.atelier_stats)) out.atelier_stats = cleanStats(raw.atelier_stats);
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

/**
 * "Brillo que *cuenta* tu *historia*" → [{ word: "Brillo", gold: false }, { word: "cuenta", gold: true }, ...]
 * Los asteriscos pueden abarcar varias palabras: "una *obra de arte*" deja las tres en dorado.
 */
export function parseTitle(title: string) {
  const out: { word: string; gold: boolean }[] = [];
  let gold = false;
  for (const raw of title.split(/\s+/).filter(Boolean)) {
    const opens = raw.startsWith("*");
    const closes = raw.endsWith("*") && raw.replace(/\*/g, "") !== "";
    if (opens) gold = true;
    const word = raw.replace(/\*/g, "");
    if (word) out.push({ word, gold });
    if (closes || (opens && raw.length > 1 && raw.endsWith("*"))) gold = false;
  }
  return out;
}