"use client";

import { finalPrice, onSale } from "@/lib/catalog/promo";
import { supabase } from "@/lib/supabase";
import { formatCOP } from "@/lib/format";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CartItem, Product } from "@/lib/types";
import { getImages } from "@/lib/catalog/images";
import { MAX_PER_LINE, isSoldOut, isUnlimited, maxUnits } from "@/lib/catalog/stock";
import { cartAlert, flyToCart } from "@/lib/cart/fly-to-cart";

type CartCtx = {
  items: CartItem[];
  open: boolean;
  count: number;
  total: number;
  setOpen: (v: boolean) => void;
  /** Agrega `qty` unidades (1 por defecto), sin pasar del stock disponible. */
  add: (p: Product, from?: HTMLElement, qty?: number) => boolean;
  /** "Comprar ahora": deja la pieza en el carrito (sin sumar otra si ya estaba) y abre el carrito directo en el pedido. */
  buyNow: (p: Product, qty?: number) => boolean;
  /** true cuando el carrito se abrió con "Comprar ahora" y debe saltar a los datos de envío. */
  checkoutRequested: boolean;
  clearCheckoutRequest: () => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
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

  const stockMessage = (p: Product) =>
    isSoldOut(p)
      ? `"${p.name}" está agotado.`
      : isUnlimited(p)
        ? `Máximo ${MAX_PER_LINE} unidades de "${p.name}" por pedido.`
        : `Solo hay ${p.stock} ${p.stock === 1 ? "unidad" : "unidades"} de "${p.name}" y ya ${p.stock === 1 ? "la tienes" : "las tienes"} en tu carrito.`;

  // Devuelve true si se agregó; false si ya no hay más unidades disponibles.
  const add = useCallback(
    (p: Product, from?: HTMLElement, qty = 1): boolean => {
      const current = itemsRef.current;
      const found = current.find((i) => i.product.id === p.id);
      const available = maxUnits(p) - (found?.qty ?? 0);
      if (available <= 0) {
        cartAlert(stockMessage(p));
        return false;
      }
      const n = Math.max(1, Math.min(Math.floor(qty) || 1, available));
      if (n < qty) cartAlert(stockMessage(p));
      if (from) flyToCart(getImages(p)[0] ?? "", from);
      commit(
        found
          ? current.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + n } : i))
          : [...current, { product: p, qty: n }]
      );
      return true;
    },
    [commit]
  );

  const buyNow = useCallback(
    (p: Product, qty?: number): boolean => {
      const inCart = itemsRef.current.some((i) => i.product.id === p.id);
      // Con cantidad elegida se suma; sin ella, si ya estaba en el carrito no se suma otra.
      if ((qty !== undefined || !inCart) && !add(p, undefined, qty ?? 1)) return false;
      setCheckoutRequested(true);
      setOpen(true);
      return true;
    },
    [add]
  );

  const clearCheckoutRequest = useCallback(() => setCheckoutRequested(false), []);

  const remove = useCallback(
    (id: string) => commit(itemsRef.current.filter((i) => i.product.id !== id)),
    [commit]
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const target = itemsRef.current.find((i) => i.product.id === id);
      if (target && qty > maxUnits(target.product)) cartAlert(stockMessage(target.product));
      commit(
        itemsRef.current
          .map((i) => (i.product.id === id ? { ...i, qty: Math.min(qty, maxUnits(i.product)) } : i))
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
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", current.map((i) => i.product.id));
    if (error || !data) return [];

    const fresh = new Map((data as Product[]).map((p) => [p.id, p]));
    const notes: string[] = [];
    const next: CartItem[] = [];

    for (const item of current) {
      const p = fresh.get(item.product.id);
      const name = item.product.name;
      if (!p || p.active === false) {
        notes.push(`"${name}" ya no está disponible y se quitó de tu carrito.`);
        continue;
      }
      if (isSoldOut(p)) {
        notes.push(`"${name}" se agotó y se quitó de tu carrito.`);
        continue;
      }
      let qty = item.qty;
      if (qty > maxUnits(p)) {
        qty = maxUnits(p);
        notes.push(`Solo quedan ${maxUnits(p)} ${maxUnits(p) === 1 ? "unidad" : "unidades"} de "${name}"; ajustamos la cantidad.`);
      }
      const before = finalPrice(item.product);
      const after = finalPrice(p);
      if (before !== after) {
        notes.push(
          after > before && onSale(item.product) && !onSale(p)
            ? `La promoción de "${name}" terminó. Antes ${formatCOP(before)}, ahora ${formatCOP(after)}.`
            : `El precio de "${name}" cambió: antes ${formatCOP(before)}, ahora ${formatCOP(after)}.`
        );
      }
      next.push({ product: { ...p, images: getImages(p) }, qty });
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
      total: items.reduce((s, i) => s + i.qty * finalPrice(i.product), 0),
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