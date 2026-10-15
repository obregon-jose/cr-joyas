export const FLY_EVENT = "cart-fly";
export const ALERT_EVENT = "cart-alert";

/** Muestra un aviso breve (toast) sobre el carrito, ej. "no hay más stock". */
export function cartAlert(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(ALERT_EVENT, { detail: message }));
}


export type FlyDetail = { src: string; x: number; y: number };

/** Lanza la miniatura del producto desde un elemento (ej. el botón "agregar") hacia el carrito flotante. */
export function flyToCart(src: string, from: HTMLElement) {
  if (typeof window === "undefined") return;
  const r = from.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent<FlyDetail>(FLY_EVENT, { detail: { src, x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  );
}