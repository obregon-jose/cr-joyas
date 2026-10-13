"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

type State = { order: string[]; hidden: string[] };

// Categorías de la tienda. Si la tabla aún no existe (migración 004), devuelve listas vacías
// y la tienda sigue funcionando con las categorías de los productos, como antes.
export function useCategories(): State {
  const [state, setState] = useState<State>({ order: [], hidden: [] });

  useEffect(() => {
    let alive = true;
    if (!supabase) return;
    supabase
      .from("categories")
      .select("name,position,active")
      .order("position", { ascending: true })
      .then(({ data, error }) => {
        if (!alive || error || !data) return;
        setState({
          order: data.map((c) => c.name as string),
          hidden: data.filter((c) => !c.active).map((c) => c.name as string),
        });
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}