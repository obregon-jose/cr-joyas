"use client";

import { onSale } from "@/lib/catalog/promo";
import { supabase } from "@/lib/supabase";
import { formatCOP } from "@/lib/format";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CartItem, Product, Variant } from "@/lib/types";
import { findVariant, lineKey, normalizeProduct, priceOf, variantImages, withVariantsFallback } from "@/lib/catalog/variants";
import { MAX_PER_LINE, hasVariants, isSoldOut, isUnlimited, maxUnits } from "@/lib/catalog/stock";
import { cartAlert, flyToCart } from "@/lib/cart/fly-to-cart";

type CartCtx = {
  items: CartItem[];
  open: boolean;
  count: number;
  total: number;
  setOpen: (v: boolean) => void;
  /** Agrega `qty` unidades (1 por defecto) de la opción indicada, sin pasar del stock disponible. */
  add: (p: Product, from?: HTMLElement, qty?: number, variantId?: string | null) => boolean;
  /** "Comprar ahora": deja la pieza en el carrito (sin sumar otra si ya estaba) y abre el carrito directo en el pedido. */
  buyNow: (p: Product, qty?: number, variantId?: string | null) => boolean;
  /** true cuando el carrito se abrió con "Comprar ahora" y debe saltar a los datos de envío. */
  checkoutRequested: boolean;
  clearCheckoutRequest: () => void;
  /** `key` es la clave de la línea (lineKey): producto + opción. */
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  /** Compara el carrito con los datos actuales de la tienda y lo corrige. Devuelve los avisos (vacío = todo en orden). */
  validate: () => Promise<string[]>;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "aurelia-cart-v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [checkoutRequested, setCheckoutRequested] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items, ready]);

  // Referencia al carrito actual: permite validar el stock al instante, sin esperar al render.
  const itemsRef = useRef<CartItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const commit = useCallback((next: CartItem[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const labelOf = (p: Product, v?: Variant | null) => (v ? `${p.name} (${v.name})` : p.name);

  const stockMessage = (p: Product, v?: Variant | null) => {
    const unit = v ?? p;
    const name = labelOf(p, v);
    return isSoldOut(unit)
      ? `"${name}" está agotado.`
      : isUnlimited(unit)
        ? `Máximo ${MAX_PER_LINE} unidades de "${name}" por pedido.`
        : `Solo hay ${unit.stock} ${unit.stock === 1 ? "unidad" : "unidades"} de "${name}" y ya ${unit.stock === 1 ? "la tienes" : "las tienes"} en tu carrito.`;
  };

  // Devuelve true si se agregó; false si falta elegir opción o ya no hay más unidades disponibles.
  const add = useCallback(
    (p: Product, from?: HTMLElement, qty = 1, variantId?: string | null): boolean => {
      const v = findVariant(p, variantId);
      if (hasVariants(p) && !v) {
        cartAlert(`Elige una opción de "${p.name}".`);
        return false;
      }
      const vid = v?.id ?? null;
      const current = itemsRef.current;
      const found = current.find((i) => i.product.id === p.id && (i.variant_id ?? null) === vid);
      const available = maxUnits(p, v) - (found?.qty ?? 0);
      if (available <= 0) {
        cartAlert(stockMessage(p, v));
        return false;
      }
      const n = Math.max(1, Math.min(Math.floor(qty) || 1, available));
      if (n < qty) cartAlert(stockMessage(p, v));
      if (from) flyToCart(variantImages(p, v)[0] ?? "", from);
      commit(
        found
          ? current.map((i) => (i === found ? { ...i, qty: i.qty + n } : i))
          : [...current, { product: p, qty: n, variant_id: vid }]
      );
      return true;
    },
    [commit]
  );

  const buyNow = useCallback(
    (p: Product, qty?: number, variantId?: string | null): boolean => {
      const vid = findVariant(p, variantId)?.id ?? null;
      const inCart = itemsRef.current.some((i) => i.product.id === p.id && (i.variant_id ?? null) === vid);
      // Con cantidad elegida se suma; sin ella, si ya estaba en el carrito no se suma otra.
      if ((qty !== undefined || !inCart) && !add(p, undefined, qty ?? 1, variantId)) return false;
      setCheckoutRequested(true);
      setOpen(true);
      return true;
    },
    [add]
  );

  const clearCheckoutRequest = useCallback(() => setCheckoutRequested(false), []);

  const remove = useCallback(
    (key: string) => commit(itemsRef.current.filter((i) => lineKey(i) !== key)),
    [commit]
  );

  const setQty = useCallback(
    (key: string, qty: number) => {
      const target = itemsRef.current.find((i) => lineKey(i) === key);
      const tv = target ? findVariant(target.product, target.variant_id) : null;
      if (target && qty > maxUnits(target.product, tv)) cartAlert(stockMessage(target.product, tv));
      commit(
        itemsRef.current
          .map((i) => (lineKey(i) === key ? { ...i, qty: Math.min(qty, maxUnits(i.product, findVariant(i.product, i.variant_id))) } : i))
          .filter((i) => i.qty > 0)
      );
    },
    [commit]
  );

  const clear = useCallback(() => commit([]), [commit]);

  // Revisa precios, promociones, stock y disponibilidad contra la base de datos.
  // Si no se puede consultar (sin conexión o modo demostración) no bloquea: el servidor vuelve a validar al crear el pedido.
  const validate = useCallback(async (): Promise<string[]> => {
    const current = itemsRef.current;
    if (!supabase || current.length === 0) return [];
    const { data, error } = await withVariantsFallback((cols) =>
      supabase!.from("products").select(cols).in("id", Array.from(new Set(current.map((i) => i.product.id))))
    );
    if (error || !data) return [];

    const fresh = new Map((data as unknown[]).map((raw) => normalizeProduct(raw)).map((p) => [p.id, p]));
    const notes: string[] = [];
    const next: CartItem[] = [];

    for (const item of current) {
      const p = fresh.get(item.product.id);
      const oldV = findVariant(item.product, item.variant_id);
      const name = labelOf(item.product, oldV);
      if (!p || p.active === false) {
        notes.push(`"${name}" ya no está disponible y se quitó de tu carrito.`);
        continue;
      }
      let v: Variant | null = null;
      if (hasVariants(p)) {
        v = findVariant(p, item.variant_id);
        if (!v) {
          notes.push(`La opción elegida de "${item.product.name}" ya no está disponible y se quitó de tu carrito.`);
          continue;
        }
      }
      if (isSoldOut(v ?? p)) {
        notes.push(`"${name}" se agotó y se quitó de tu carrito.`);
        continue;
      }
      let qty = item.qty;
      const max = maxUnits(p, v);
      if (qty > max) {
        qty = max;
        notes.push(`Solo quedan ${max} ${max === 1 ? "unidad" : "unidades"} de "${name}"; ajustamos la cantidad.`);
      }
      const before = priceOf(item.product, oldV);
      const after = priceOf(p, v);
      if (before !== after) {
        notes.push(
          after > before && onSale(item.product) && !onSale(p)
            ? `La promoción de "${name}" terminó. Antes ${formatCOP(before)}, ahora ${formatCOP(after)}.`
            : `El precio de "${name}" cambió: antes ${formatCOP(before)}, ahora ${formatCOP(after)}.`
        );
      }
      next.push({ product: p, qty, variant_id: v?.id ?? null });
    }

    commit(next);
    return notes;
  }, [commit]);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      open,
      setOpen,
      add,
      buyNow,
      checkoutRequested,
      clearCheckoutRequest,
      remove,
      setQty,
      clear,
      validate,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * priceOf(i.product, findVariant(i.product, i.variant_id)), 0),
    }),
    [items, open, add, buyNow, checkoutRequested, clearCheckoutRequest, remove, setQty, clear, validate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}