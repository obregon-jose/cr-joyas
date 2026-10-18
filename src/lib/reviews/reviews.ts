"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/device";

export type PublicReview = {
  id: string;
  product_id: string | null;
  product_name: string | null;
  rating: number;
  customer_name: string;
  comment: string;
  images: string[];
  verified: boolean;
  created_at: string;
};

export type Reviewable = {
  product_id: string;
  product_name: string;
  image: string | null;
  order_id: string;
  order_number: number | null;
  customer_name: string;
  reviewed: boolean;
};

const asImages = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

// Caché compartido: Testimonials y el modal de producto usan las mismas reseñas con una sola consulta.
let cache: PublicReview[] | null = null;
let inflight: Promise<PublicReview[]> | null = null;
const listeners = new Set<(r: PublicReview[]) => void>();

async function fetchReviews(force = false): Promise<PublicReview[]> {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;
  inflight = (async () => {
    let result: PublicReview[] = [];
    if (supabase) {
      const { data, error } = await supabase
        .from("public_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (!error && data) {
        result = (data as PublicReview[]).map((r) => ({ ...r, rating: Number(r.rating), images: asImages(r.images) }));
      }
    }
    cache = result;
    inflight = null;
    listeners.forEach((fn) => fn(result));
    return result;
  })();
  return inflight;
}

/** Reseñas aprobadas (vista pública). */
export function usePublicReviews() {
  const [reviews, setReviews] = useState<PublicReview[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    let alive = true;
    fetchReviews().then((r) => {
      if (alive) {
        setReviews(r);
        setLoading(false);
      }
    });
    listeners.add(setReviews);
    return () => {
      alive = false;
      listeners.delete(setReviews);
    };
  }, []);

  return { reviews, loading, reload: () => fetchReviews(true) };
}

/** Promedio y cantidad (opcionalmente solo de una pieza). */
export function summarize(reviews: PublicReview[], productId?: string) {
  const list = productId ? reviews.filter((r) => r.product_id === productId) : reviews;
  const count = list.length;
  const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { count, average };
}

/** Piezas que ESTE dispositivo compró (pedido confirmado) y si ya las reseñó. */
export function useReviewable() {
  const [items, setItems] = useState<Reviewable[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("my_reviewable_products", { p_device: getDeviceId() });
    setItems(!error && Array.isArray(data) ? (data as Reviewable[]) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    // Al volver a la pestaña se revisa de nuevo (por si el admin confirmó el pago mientras tanto).
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return { items, loading, refresh };
}

// Nombre y ciudad recordados en el navegador para no escribirlos otra vez.
const PROFILE_KEY = "aurelia-reviewer";
export type ReviewerProfile = { name: string };

export function loadProfile(): ReviewerProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.name === "string" ? { name: p.name } : null;
  } catch {
    return null;
  }
}

export function saveProfile(p: ReviewerProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  } catch {}
}

export async function submitReview(input: {
  productId: string;
  rating: number;
  name: string;
  comment: string;
  images: string[];
}) {
  if (!supabase) throw new Error("Reseñas no disponibles en modo demostración");
  const { error } = await supabase.rpc("submit_review", {
    p_device: getDeviceId(),
    p_product_id: input.productId,
    p_rating: input.rating,
    p_name: input.name,
    p_comment: input.comment,
    p_images: input.images,
  });
  if (error) throw new Error(error.message);
}

/** Vincula un pedido a este dispositivo con el número de pedido y el teléfono de la compra. */
export async function claimOrder(orderNumber: number, phone: string) {
  if (!supabase) throw new Error("No disponible en modo demostración");
  const { error } = await supabase.rpc("claim_order", {
    p_device: getDeviceId(),
    p_order_number: orderNumber,
    p_phone: phone,
  });
  if (error) throw new Error(error.message);
}

/** Sube una foto de reseña (se reduce antes de subir). Solo funciona para dispositivos con compra confirmada. */
export async function uploadReviewImage(file: File): Promise<string> {
  const { shrinkImage } = await import("@/lib/media/image-tools");
  const small = await shrinkImage(file);
  let lastError = "No se pudo subir la foto";
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 900));
    try {
      const fd = new FormData();
      fd.append("file", small);
      const res = await fetch("/api/review-upload", { method: "POST", body: fd, headers: { "x-device-id": getDeviceId() } });
      const text = await res.text();
      let json: { url?: string; error?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (res.ok && json.url) return json.url;
      lastError = json.error ?? (res.status === 413 ? "La foto es demasiado grande" : `Error ${res.status} al subir la foto`);
      if (res.status < 500) break;
    } catch {
      lastError = "Sin conexión con el servidor";
    }
  }
  throw new Error(lastError);
}