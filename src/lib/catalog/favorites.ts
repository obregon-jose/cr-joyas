"use client";

import { useCallback, useEffect, useState } from "react";

// Los favoritos viven en este navegador (localStorage), no en la base de datos. Es la misma clave que ya usaban las tarjetas.
const KEY = "joyeria-favorites";
const EVENT = "favorites-changed";

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // modo privado o sin espacio: los favoritos simplemente no se guardan
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Favoritos compartidos: todas las tarjetas, el filtro del catálogo y otras pestañas ven lo mismo al instante.
 * `ready` es false hasta que el navegador leyó los favoritos (evita diferencias entre servidor y cliente).
 */
export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync); // cambios hechos en otra pestaña
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const has = useCallback((id: string) => ids.includes(String(id)), [ids]);
  const toggle = useCallback((id: string) => {
    const key = String(id);
    const cur = read();
    write(cur.includes(key) ? cur.filter((x) => x !== key) : [...cur, key]);
  }, []);

  return { ids, has, toggle, ready, count: ids.length };
}