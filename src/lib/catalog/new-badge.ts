import { Product } from "@/lib/types";

/** "Nuevo": la pieza se agregó hace un mes o menos. */
export function isNew(p: Pick<Product, "created_at">, now = new Date()): boolean {
  if (!p.created_at) return false;
  const created = new Date(p.created_at);
  if (Number.isNaN(created.getTime())) return false;
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - 1);
  return created >= limit; // sin tope superior: un reloj algo atrasado no debe ocultar una pieza recién agregada
}