"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Collection = { id: string; name: string; tag: string; img: string };

// Respaldo si la tabla de categorías aún no existe, y fotos por defecto de las 4 categorías originales.
const DEFAULT_IMG: Record<string, string> = {
  Anillos: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1000&q=80",
  Collares: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1000&q=80",
  Aretes: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1000&q=80",
  Pulseras: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1000&q=80",
};
const DEFAULT_TAG: Record<string, string> = {
  Anillos: "Compromiso & Eternidad",
  Collares: "Elegancia en el cuello",
  Aretes: "Luz en cada gesto",
  Pulseras: "Detalles que enamoran",
};
export const FALLBACK_COLLECTIONS: Collection[] = Object.keys(DEFAULT_IMG).map((name) => ({
  id: name.toLowerCase(),
  name,
  tag: DEFAULT_TAG[name],
  img: DEFAULT_IMG[name],
}));

/**
 * Colecciones de la portada = categorías activas, en su orden.
 * Imagen: la de la categoría; si no tiene, la foto de su producto más reciente; si tampoco, la original o ninguna.
 */
export function useCollections(): Collection[] {
  const [list, setList] = useState<Collection[]>(FALLBACK_COLLECTIONS);

  useEffect(() => {
    let alive = true;
    if (!supabase) return;
    (async () => {
      const [cats, prods] = await Promise.all([
        supabase!.from("categories").select("id,name,tagline,image_url,position,active").eq("active", true).order("position", { ascending: true }),
        supabase!.from("products").select("category,image_url,active,created_at").order("created_at", { ascending: false }).limit(300),
      ]);
      if (!alive || cats.error || !cats.data || cats.data.length === 0) return;

      const productImg = new Map<string, string>();
      ((prods.data as { category: string; image_url: string; active?: boolean }[] | null) ?? []).forEach((p) => {
        if (p.active !== false && p.image_url && !productImg.has(p.category)) productImg.set(p.category, p.image_url);
      });

      setList(
        cats.data.map((c) => ({
          id: String(c.id),
          name: c.name as string,
          tag: ((c.tagline as string | null) ?? "").trim() || DEFAULT_TAG[c.name as string] || "",
          img: (c.image_url as string | null) || productImg.get(c.name as string) || DEFAULT_IMG[c.name as string] || "",
        }))
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  return list;
}