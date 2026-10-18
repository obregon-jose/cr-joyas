"use client";

import { finalPrice, onSale } from "./promo";
import { supabase } from "./supabase";
import { formatCOP } from "./format";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CartItem, Product } from "./types";
import { getImages } from "./images";
import { cartAlert, flyToCart } from "./fly-to-cart";

type CartCtx = {
  items: CartItem[];
  open: boolean;
  count: number;
  total: number;
  setOpen: (v: boolean) => void;
  add: (p: Product, from?: HTMLElement) => boolean;
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
    p.stock <= 0
      ? `"${p.name}" está agotado.`
      : `Solo hay ${p.stock} ${p.stock === 1 ? "unidad" : "unidades"} de "${p.name}" y ya ${p.stock === 1 ? "la tienes" : "las tienes"} en tu carrito.`;

  // Devuelve true si se agregó; false si ya no hay más unidades disponibles.
  const add = useCallback(
    (p: Product, from?: HTMLElement): boolean => {
      const current = itemsRef.current;
      const found = current.find((i) => i.product.id === p.id);
      if ((found?.qty ?? 0) >= p.stock) {
        cartAlert(stockMessage(p));
        return false;
      }
      if (from) flyToCart(getImages(p)[0] ?? "", from);
      commit(
        found
          ? current.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i))
          : [...current, { product: p, qty: 1 }]
      );
      return true;
    },
    [commit]
  );

  const remove = useCallback(
    (id: string) => commit(itemsRef.current.filter((i) => i.product.id !== id)),
    [commit]
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const target = itemsRef.current.find((i) => i.product.id === id);
      if (target && qty > target.product.stock) cartAlert(stockMessage(target.product));
      commit(
        itemsRef.current
          .map((i) => (i.product.id === id ? { ...i, qty: Math.min(qty, i.product.stock) } : i))
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
      if (p.stock <= 0) {
        notes.push(`"${name}" se agotó y se quitó de tu carrito.`);
        continue;
      }
      let qty = item.qty;
      if (qty > p.stock) {
        qty = p.stock;
        notes.push(`Solo quedan ${p.stock} ${p.stock === 1 ? "unidad" : "unidades"} de "${name}"; ajustamos la cantidad.`);
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
      remove,
      setQty,
      clear,
      validate,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * finalPrice(i.product), 0),
    }),
    [items, open, add, remove, setQty, clear, validate]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}