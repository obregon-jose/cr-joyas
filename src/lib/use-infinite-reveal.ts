"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export const PAGE_SIZE = 12;

// Carga progresiva: muestra PAGE_SIZE elementos y, al acercarse al final de la lista,
// revela los siguientes PAGE_SIZE hasta mostrarlos todos.
//   total    -> cantidad total de elementos ya filtrados
//   resetKey -> cuando cambia (filtros, categoría, orden) se vuelve a la primera página
export function useInfiniteReveal(total: number, resetKey: string, pageSize = PAGE_SIZE) {
  const [visible, setVisible] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Se activa cuando el final de la lista está a menos de 500px de la pantalla.
  const nearEnd = useInView(sentinelRef, { margin: "0px 0px 500px 0px" });
  const hasMore = visible < total;

  useEffect(() => {
    setVisible(pageSize);
  }, [resetKey, pageSize]);

  useEffect(() => {
    if (!nearEnd || !hasMore) return;
    // Pequeña pausa para que se vea el indicador de carga y la entrada sea suave.
    const t = window.setTimeout(() => setVisible((v) => v + pageSize), 2000);
    return () => window.clearTimeout(t);
  }, [nearEnd, hasMore, visible, pageSize]);

  return { visible, hasMore, loadingMore: nearEnd && hasMore, sentinelRef };
}