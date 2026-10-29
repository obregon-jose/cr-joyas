"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { demoProducts } from "@/lib/demo-data";
import { Product } from "@/lib/types";
import { normalizeProduct, withVariantsFallback } from "@/lib/catalog/variants";

// Caché en memoria: al pasar del catálogo a una ficha (y viceversa) los productos ya están listos y solo se refrescan en segundo plano.
let cached: Product[] | null = null;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(cached ?? []);
  const [loading, setLoading] = useState(cached === null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) {
        if (!cached) await new Promise((r) => setTimeout(r, 700));
        if (alive) {
          cached = demoProducts;
          setProducts(demoProducts);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await withVariantsFallback((cols) =>
        supabase!.from("products").select(cols).order("created_at", { ascending: false })
      );
      if (!alive) return;
      // Los productos pausados (active = false) nunca se muestran en la tienda,
      // ni siquiera cuando el admin tiene la sesión abierta.
      const visible = ((data as unknown[] | null) ?? [])
        .map((p) => normalizeProduct(p))
        .filter((p) => p.active !== false);
      const next = error || visible.length === 0 ? demoProducts : visible;
      cached = next;
      setProducts(next);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return { products, loading };
}