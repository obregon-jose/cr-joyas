export type ToastKind = "success" | "error" | "info";
export type ToastDetail = { text: string; kind: ToastKind; ms?: number };

export const TOAST_EVENT = "app-toast";

function emit(text: string, kind: ToastKind, ms?: number) {
  if (typeof window === "undefined" || !text) return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { text, kind, ms } }));
}

/**
 * Avisos breves en todo el sitio (público y admin). Se pueden llamar desde cualquier parte, sin proveedor:
 *   toast.success("Guardado ✓")   toast.error("No se pudo guardar")   toast.info("Solo quedan 3 unidades")
 */
export const toast = {
  success: (text: string, ms?: number) => emit(text, "success", ms),
  error: (text: string, ms?: number) => emit(text, "error", ms),
  info: (text: string, ms?: number) => emit(text, "info", ms),
};