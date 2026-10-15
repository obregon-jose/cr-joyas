"use client";

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

  const value = useMemo<CartCtx>(
    () => ({
      items,
      open,
      setOpen,
      add,
      remove,
      setQty,
      clear,
      count: items.reduce((s, i) => s + i.qty, 0),
      total: items.reduce((s, i) => s + i.qty * i.product.price, 0),
    }),
    [items, open, add, remove, setQty, clear]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}