"use client";

import { finalPrice, onSale } from "@/lib/promo";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Check, Loader2, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import SafeImage from "./SafeImage";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useSiteSettings, waLink } from "@/lib/site-settings";
import { buildOrderMessage } from "@/lib/order-message";
import { getDeviceId } from "@/lib/device";

type Step = "cart" | "checkout" | "done";

const empty = { customer_name: "", email: "", phone: "", address: "", city: "", notes: "" };

type Line = { name: string; price: number; qty: number };
type PlacedOrder = {
  number: number | null;
  total: number;
  items: Line[];
  customer: typeof empty;
};

export default function CartDrawer() {
  const { items, open, setOpen, total, remove, setQty, clear, validate } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const site = useSiteSettings();

  // Si el cliente vuelve a agregar piezas, se deja atrás la pantalla del pedido anterior.
  useEffect(() => {
    if (step === "done" && items.length > 0) setStep("cart");
  }, [items.length, step]);

  // Al abrir el carrito se revisan precios y stock para que el cliente vea siempre valores al día.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    validate().then((n) => alive && n.length && setNotices(n));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Antes de pedir los datos se revisa otra vez: si algo cambió se avisa y el cliente confirma el nuevo total.
  const goCheckout = async () => {
    setChecking(true);
    const n = await validate();
    setChecking(false);
    if (n.length) {
      setNotices(n);
      setStep("cart");
      return;
    }
    setNotices([]);
    setStep("checkout");
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  // Guarda el pedido. El servidor (create_order, migración 007) calcula precios y total.
  const placeOrder = async (): Promise<Omit<PlacedOrder, "customer">> => {
    if (!supabase) {
      await new Promise((r) => setTimeout(r, 1200)); // modo demo sin Supabase
      return { number: null, total, items: items.map((i) => ({ name: i.product.name, price: finalPrice(i.product), qty: i.qty })) };
    }
    const { data, error: err } = await supabase.rpc("create_order", {
      p_name: form.customer_name,
      p_email: form.email,
      p_phone: form.phone,
      p_address: form.address,
      p_city: form.city,
      p_notes: form.notes,
      p_items: items.map((i) => ({ id: String(i.product.id), qty: i.qty })),
      p_device: getDeviceId(), // identifica este dispositivo para habilitarle las reseñas
    });
    if (!err && data) {
      const d = data as { order_number: number | null; total: number; items: Line[] };
      return { number: d.order_number, total: Number(d.total), items: d.items };
    }
    // La migración 007 aún no se ejecutó: se usa el método anterior.
    const missing = err && (err.code === "PGRST202" || err.code === "42883" || /create_order|schema cache/i.test(err.message));
    if (!missing) throw new Error(err?.message ?? "Error al registrar el pedido");
    const lines = items.map((i) => ({ id: i.product.id, name: i.product.name, price: finalPrice(i.product), qty: i.qty }));
    const { error: insErr } = await supabase.from("orders").insert({ ...form, items: lines, total });
    if (insErr) throw insErr;
    return { number: null, total, items: lines };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      // Última revisión: si un precio o el stock cambió mientras llenaba los datos, vuelve al carrito con el aviso.
      const changes = await validate();
      if (changes.length) {
        setNotices(changes);
        setStep("cart");
        return;
      }
      const result = await placeOrder();
      setPlaced({ ...result, customer: form });
      clear();
      setForm(empty);
      setStep("done");
    } catch (err) {
      const text = err instanceof Error ? err.message : "";
      // Los mensajes del servidor (sin stock, pieza no disponible) son claros para el cliente.
      setError(
        /stock|disponible|carrito|Cantidad|Faltan/i.test(text)
          ? text
          : "No pudimos registrar tu pedido. Inténtalo de nuevo."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80]" initial={{ opacity: 1 }} exit={{ opacity: 1 }}>
          <motion.div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 280 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gold-400/20 bg-ink-900"
          >
            <header className="flex items-center justify-between border-b border-white/10 p-6">
              <div className="flex items-center gap-3">
                {step === "checkout" && (
                  <button onClick={() => setStep("cart")} aria-label="Volver" className="rounded-full p-2 hover:bg-white/10">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <h2 className="font-serif text-3xl">
                  {step === "cart" ? "Tu carrito" : step === "checkout" ? "Finalizar pedido" : "¡Gracias!"}
                </h2>
              </div>
              <button onClick={close} aria-label="Cerrar" className="rounded-full p-2 transition hover:rotate-90 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="relative flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === "cart" && (
                  <motion.div
                    key="cart"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className="p-6"
                  >
                    {notices.length > 0 && (
                      <div role="alert" className="mb-4 space-y-2 rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm text-gold-100">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium">Actualizamos tu carrito</p>
                          <button onClick={() => setNotices([])} aria-label="Cerrar aviso" className="text-white/50 hover:text-white">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <ul className="list-disc space-y-1 pl-5 text-gold-100/90">
                          {notices.map((m) => <li key={m}>{m}</li>)}
                        </ul>
                        <p className="text-xs text-white/50">Revisa el total y toca Continuar para seguir.</p>
                      </div>
                    )}
                    {items.length === 0 ? (
                      <div className="flex flex-col items-center gap-4 py-24 text-center text-white/50">
                        <ShoppingBag className="h-12 w-12 text-gold-500/50" strokeWidth={1} />
                        <p className="font-serif text-2xl text-white/70">Tu carrito está vacío</p>
                        <p className="text-sm">Descubre piezas hechas para brillar.</p>
                      </div>
                    ) : (
                      <ul className="space-y-5">
                        <AnimatePresence initial={false}>
                          {items.map(({ product, qty }) => (
                            <motion.li
                              key={product.id}
                              layout
                              initial={{ opacity: 0, x: 40 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0 }}
                              className="flex gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-3"
                            >
                              <SafeImage src={product.image_url} alt={product.name} className="h-24 w-24 shrink-0 rounded-xl object-cover" />
                              <div className="flex min-w-0 flex-1 flex-col justify-between">
                                <div>
                                  <p className="truncate font-serif text-lg">{product.name}</p>
                                  <p className="text-sm text-gold-300">
                                    {formatCOP(finalPrice(product))}
                                    {onSale(product) && <span className="ml-2 text-xs text-white/35 line-through">{formatCOP(product.price)}</span>}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 rounded-full border border-white/10 px-2 py-1">
                                    <button onClick={() => setQty(product.id, qty - 1)} aria-label="Menos" className="rounded-full p-1 hover:bg-white/10">
                                      <Minus className="h-3.5 w-3.5" />
                                    </button>
                                    <span className="w-4 text-center text-sm">{qty}</span>
                                    <button onClick={() => setQty(product.id, qty + 1)} aria-label="Más" className="rounded-full p-1 hover:bg-white/10">
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <button onClick={() => remove(product.id)} aria-label="Quitar" className="rounded-full p-2 text-white/40 transition hover:text-rose-gold">
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ul>
                    )}
                  </motion.div>
                )}

                {step === "checkout" && (
                  <motion.form
                    key="checkout"
                    id="checkout-form"
                    onSubmit={submit}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    className="space-y-4 p-6"
                  >
                    <input required className="input" placeholder="Nombre completo" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
                    <input required type="email" className="input" placeholder="Correo electrónico" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    <input required className="input" placeholder="Teléfono / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                      <input required className="input" placeholder="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                      <input required className="input" placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <textarea rows={3} className="input resize-none" placeholder="Notas (grabado, talla, regalo...)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    <p className="text-xs text-white/40">
                      Tu pedido queda registrado en nuestro sistema. Después podrás enviarlo también por WhatsApp (opcional) para agilizar la confirmación del pago y el envío asegurado.
                    </p>
                    {error && <p className="text-sm text-rose-gold">{error}</p>}
                  </motion.form>
                )}

                {step === "done" && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-6 px-8 py-24 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", damping: 12, delay: 0.1 }}
                      className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-200"
                    >
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring" }}>
                        <Check className="h-12 w-12 text-ink-950" strokeWidth={3} />
                      </motion.span>
                    </motion.div>
                    <h3 className="font-serif text-3xl">Pedido recibido</h3>
                    <p className="text-white/60">
                      {placed?.number ? (
                        <>
                          Tu número de pedido es <span className="font-semibold text-gold-300">#{placed.number}</span>.{" "}
                        </>
                      ) : null}
                      Ya quedó registrado. Te escribiremos muy pronto para confirmar todos los detalles.
                    </p>
                    {placed && (
                      <div className="w-full space-y-3">
                        <a
                          href={waLink(
                            site.whatsapp,
                            buildOrderMessage({
                              number: placed.number,
                              brand: site.brand_name,
                              customer: placed.customer,
                              items: placed.items,
                              total: placed.total,
                            })
                          )}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-gold w-full"
                        >
                          <MessageCircle className="h-4 w-4" /> Enviar pedido por WhatsApp
                        </a>
                        <p className="text-xs text-white/40">Opcional: agiliza la confirmación. Puedes enviarlo cuando quieras.</p>
                      </div>
                    )}
                    <button onClick={close} className="btn-ghost">Seguir explorando</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {step !== "done" && items.length > 0 && (
              <footer className="space-y-4 border-t border-white/10 p-6">
                <div className="flex items-end justify-between">
                  <span className="text-sm uppercase tracking-widest text-white/50">Total</span>
                  <motion.span key={total} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="gold-text font-serif text-3xl">
                    {formatCOP(total)}
                  </motion.span>
                </div>
                {step === "cart" ? (
                  <button onClick={goCheckout} disabled={checking} className="btn-gold w-full disabled:opacity-60">
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continuar"}
                  </button>
                ) : (
                  <button type="submit" form="checkout-form" disabled={sending} className="btn-gold w-full disabled:opacity-60">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar pedido"}
                  </button>
                )}
              </footer>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}