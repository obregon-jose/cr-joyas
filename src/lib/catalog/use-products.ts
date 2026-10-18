"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { demoProducts } from "@/lib/demo-data";
import { Product } from "@/lib/types";
import { getImages } from "@/lib/catalog/images";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) {
        await new Promise((r) => setTimeout(r, 700));
        if (alive) {
          setProducts(demoProducts);
          setLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (!alive) return;
      // Los productos pausados (active = false) nunca se muestran en la tienda,
      // ni siquiera cuando el admin tiene la sesión abierta.
      const visible = ((data as Product[] | null) ?? [])
  .filter((p) => p.active !== false)
  .map((p) => ({ ...p, images: getImages(p) }));
      setProducts(error || visible.length === 0 ? demoProducts : visible);
      setLoading(false);
    }
    load();
    return () => {
      alive = false;
    };
  }, []);

  return { products, loading };
}
