import { Product } from "@/lib/types";

export type PromoStatus = "activa" | "programada" | "vencida";

type PromoFields = Pick<Product, "price" | "discount_percent" | "promo_start" | "promo_end">;

/** Estado de la promoción de un producto (null = no tiene). */
export function promoStatus(p: PromoFields, now = Date.now()): PromoStatus | null {
  if (!p.discount_percent || p.discount_percent < 1) return null;
  if (p.promo_start && new Date(p.promo_start).getTime() > now) return "programada";
  if (p.promo_end && new Date(p.promo_end).getTime() <= now) return "vencida";
  return "activa";
}

export const onSale = (p: PromoFields) => promoStatus(p) === "activa";

/** Precio final. Misma fórmula que product_final_price en la base de datos (a la centena más cercana). */
export function finalPrice(p: PromoFields): number {
  if (!onSale(p)) return p.price;
  return Math.floor((p.price * (100 - (p.discount_percent as number)) + 5000) / 10000) * 100;
}

/** Zona horaria de Colombia (sin horario de verano): las fechas se guardan como día completo en hora local. */
export const fromDateInput = (d: string, edge: "start" | "end") =>
  d ? `${d}T${edge === "start" ? "00:00:00" : "23:59:59"}-05:00` : null;

export const toDateInput = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" }) : "";

const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" });

/** Texto corto con la vigencia: "Hasta el 25 oct", "Desde el 1 nov"… */
export function promoRange(p: Pick<Product, "promo_start" | "promo_end">): string {
  if (p.promo_start && p.promo_end) return `${dayLabel(p.promo_start)} – ${dayLabel(p.promo_end)}`;
  if (p.promo_end) return `Hasta el ${dayLabel(p.promo_end)}`;
  if (p.promo_start) return `Desde el ${dayLabel(p.promo_start)}`;
  return "Sin fecha de fin";
}