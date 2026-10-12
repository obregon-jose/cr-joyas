"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CartItem, Product } from "./types";

type CartCtx = {
  items: CartItem[];
  open: boolean;
  count: number;
  total: number;
  setOpen: (v: boolean) => void;
  add: (p: Product) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "crjoyas-cart-v1";

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

  const add = useCallback((p: Product) => {
    setItems((prev) => {
      const found = prev.find((i) => i.product.id === p.id);
      if (found) {
        return prev.map((i) =>
          i.product.id === p.id ? { ...i, qty: Math.min(i.qty + 1, Math.max(p.stock, 1)) } : i
        );
      }
      return [...prev, { product: p, qty: 1 }];
    });
    setOpen(true);
  }, []);

  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((i) => i.product.id !== id)),
    []
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.product.id === id ? { ...i, qty: Math.min(qty, Math.max(i.product.stock, 1)) } : i))
        .filter((i) => i.qty > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

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
