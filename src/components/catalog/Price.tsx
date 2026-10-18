import { Product } from "@/lib/types";
import { formatCOP } from "@/lib/format";
import { finalPrice, onSale } from "@/lib/catalog/promo";

/** Precio de un producto: con promoción vigente muestra el precio de lista tachado y el nuevo precio. */
export default function Price({ product, className }: { product: Product; className: string }) {
  if (!onSale(product)) return <p className={`gold-text font-serif ${className}`}>{formatCOP(product.price)}</p>;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
      <p className={`gold-text font-serif ${className}`}>{formatCOP(finalPrice(product))}</p>
      <p className="text-[11px] text-white/40 line-through sm:text-sm">{formatCOP(product.price)}</p>
    </div>
  );
}

/** Etiqueta "-20%" para las tarjetas y el detalle. */
export function DiscountBadge({ product, className = "" }: { product: Product; className?: string }) {
  if (!onSale(product)) return null;
  return (
    <span
      className={`rounded-full bg-gradient-to-r from-rose-gold to-gold-300 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-950 sm:px-3 sm:py-1.5 sm:text-[10px] ${className}`}
    >
      -{product.discount_percent}%
    </span>
  );
}