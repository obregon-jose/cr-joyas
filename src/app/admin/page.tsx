"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Loader2, LogOut, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCOP } from "@/lib/format";
import { Category, Order, Product } from "@/lib/types";
import UsersPanel from "@/components/UsersPanel";
import CategoriesPanel from "@/components/CategoriesPanel";
import ImageManager from "@/components/ImageManager";
import SettingsPanel from "@/components/SettingsPanel";
import ReviewsPanel from "@/components/ReviewsPanel";
import PromotionsPanel from "@/components/PromotionsPanel";
import { finalPrice, fromDateInput, promoStatus, toDateInput } from "@/lib/promo";
import { useSiteSettings, waLink } from "@/lib/site-settings";
import { buildCustomerMessage, phoneToWa } from "@/lib/order-message";
import { getImages } from "@/lib/images";
import { deleteImages } from "@/lib/delete-images";

const DEFAULT_CATEGORIES = ["Anillos", "Collares", "Aretes", "Pulseras"];

const blank = {
  name: "",
  description: "",
  price: "",
  category: "Anillos",
  material: "",
  images: [] as string[],
  stock: "1",
  featured: false,
  active: true,
  discount: "",
  promoStart: "",
  promoEnd: "",
};

type Form = typeof blank;

export default function AdminPage() {
  const site = useSiteSettings();
  const [token, setToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [legacyMode, setLegacyMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<Form>(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalImages, setOriginalImages] = useState<string[]>([]); // imágenes que el producto ya tenía al empezar a editar
  const [saving, setSaving] = useState(false);
  const [isRoot, setIsRoot] = useState(false);
  const [tab, setTab] = useState<"panel" | "promos" | "categories" | "reviews" | "settings" | "users">("panel");
  const [catRows, setCatRows] = useState<Category[]>([]);

  // Categorías activas de la tabla (migración 004); si aún no existe, las de siempre.
  const categoryNames = useMemo(
    () =>
      catRows.length
        ? catRows.filter((c) => c.active).map((c) => c.name)
        : Array.from(new Set([...DEFAULT_CATEGORIES, ...products.map((p) => p.category)])),
    [catRows, products]
  );

  // Si el producto en edición tiene una categoría que ya no está en la lista, se conserva como opción.
  const categories = useMemo(
    () => (form.category && !categoryNames.includes(form.category) ? [...categoryNames, form.category] : categoryNames),
    [categoryNames, form.category]
  );

  // Un producto nuevo no puede quedar con una categoría que ya no existe.
  useEffect(() => {
    if (!editingId && categoryNames.length && !categoryNames.includes(form.category)) {
      setForm((f) => ({ ...f, category: categoryNames[0] }));
    }
  }, [editingId, categoryNames, form.category]);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [p, o, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("position", { ascending: true }),
    ]);
    setProducts((p.data as Product[]) ?? []);
    setOrders((o.data as Order[]) ?? []);
    setCatRows(c.error ? [] : ((c.data as Category[]) ?? []));
  }, []);

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Verifica que el usuario sea administrador (migración 001).
  useEffect(() => {
    if (!token || !supabase) {
      setIsAdmin(null);
      return;
    }
    supabase.rpc("is_admin").then(({ data, error }) => {
      if (error) {
        // La migración aún no se ejecutó: se permite el acceso anterior y se avisa.
        setLegacyMode(true);
        setIsAdmin(true);
      } else {
        setLegacyMode(false);
        setIsAdmin(Boolean(data));
      }
    });
  }, [token]);

  useEffect(() => {
    if (token && isAdmin) load();
  }, [token, isAdmin, load]);

  // ¿Es root? (migración 002). Si la función no existe aún, simplemente no se muestra la pestaña.
  useEffect(() => {
    if (!token || !isAdmin || !supabase) {
      setIsRoot(false);
      setTab("panel");
      return;
    }
    supabase.rpc("is_root").then(({ data, error }) => setIsRoot(!error && Boolean(data)));
  }, [token, isAdmin]);

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="max-w-md text-white/60">
          Configura <code className="text-gold-300">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="text-gold-300">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en <code>.env.local</code> para usar el panel.
        </p>
      </div>
    );
  }

  if (checking || (token && isAdmin === null)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setMsg("");
            const { error } = await supabase!.auth.signInWithPassword({ email, password });
            if (error) setMsg("Credenciales incorrectas");
          }}
          className="w-full max-w-sm space-y-4 rounded-3xl border border-gold-400/20 bg-ink-900 p-8"
        >
          <h1 className="gold-text text-center font-serif text-3xl tracking-[0.2em]">ADMIN</h1>
          <input className="input" type="email" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {msg && <p className="text-sm text-rose-gold">{msg}</p>}
          <button className="btn-gold w-full">Entrar</button>
        </form>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <p className="max-w-md text-white/70">
          Tu usuario no tiene permisos de administrador. Si es tu cuenta, agrégala a la tabla{" "}
          <code className="text-gold-300">admins</code> (instrucciones al final de la migración 001).
        </p>
        <button onClick={() => supabase!.auth.signOut()} className="btn-ghost">Cerrar sesión</button>
      </div>
    );
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setOriginalImages(getImages(p));
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: String(p.price),
      category: p.category,
      material: p.material ?? "",
      images: getImages(p),
      stock: String(p.stock),
      featured: p.featured,
      active: p.active !== false,
      discount: p.discount_percent ? String(p.discount_percent) : "",
      promoStart: toDateInput(p.promo_start),
      promoEnd: toDateInput(p.promo_end),
    });
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    // Las imágenes recién subidas que no se llegaron a guardar se borran de ImgBB.
    deleteImages(form.images.filter((u) => !originalImages.includes(u)), token);
    setOriginalImages([]);
    setEditingId(null);
    setForm(blank);
    setMsg("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.images.length === 0) return setMsg("Sube al menos una imagen");
    const pct = form.discount.trim() === "" ? null : Number(form.discount);
    if (pct !== null && (!Number.isInteger(pct) || pct < 1 || pct > 90)) return setMsg("El descuento debe ser un número entero entre 1 y 90");
    if (pct !== null && form.promoStart && form.promoEnd && form.promoStart > form.promoEnd) return setMsg("La fecha final de la promoción no puede ser anterior a la inicial");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: Number(form.price),
      category: form.category,
      material: form.material,
      image_url: form.images[0], // portada
      images: form.images,
      stock: Number(form.stock),
      featured: form.featured,
      active: form.active,
      discount_percent: pct,
      promo_start: pct === null ? null : fromDateInput(form.promoStart, "start"),
      promo_end: pct === null ? null : fromDateInput(form.promoEnd, "end"),
    };
    const { error } = editingId
      ? await supabase!.from("products").update(payload).eq("id", editingId)
      : await supabase!.from("products").insert(payload);
    setSaving(false);
    if (error) {
      const missingColumn = /(active|images|discount_percent|promo_)/i.test(error.message) && /column/i.test(error.message);
      return setMsg(missingColumn ? "Falta ejecutar una migración en Supabase (001 columna active, 005 columna images, 011 promociones)." : error.message);
    }
    // Las imágenes que se quitaron del producto se borran de ImgBB para no llenar el servidor.
    deleteImages(originalImages.filter((u) => !form.images.includes(u)), token);
    setOriginalImages([]);
    setMsg(editingId ? "Cambios guardados ✓" : "Producto creado ✓");
    setEditingId(null);
    setForm(blank);
    load();
  };

  const toggleActive = async (p: Product) => {
    const { error } = await supabase!.from("products").update({ active: p.active === false }).eq("id", p.id);
    if (error) return setMsg(error.message);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("¿Eliminar este producto definitivamente? Si solo quieres ocultarlo, usa el ojo (pausar).")) return;
    const removed = products.find((p) => p.id === id);
    const { error: delErr } = await supabase!.from("products").delete().eq("id", id);
    if (delErr) return setMsg(delErr.message);
    if (removed) deleteImages(getImages(removed), token); // el producto ya no existe: sus fotos tampoco
    if (editingId === id) {
      setOriginalImages([]);
      setEditingId(null);
      setForm(blank);
    }
    load();
  };

  const setStatus = async (id: string, status: string) => {
    await supabase!.from("orders").update({ status }).eq("id", id);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-14 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="gold-text font-serif text-4xl">Panel Aurelia</h1>
        <div className="flex max-w-full flex-wrap items-center gap-3">
          <div className="flex max-w-full overflow-x-auto rounded-full border border-white/10 p-1 text-xs uppercase tracking-widest">
            {(
              [
                ["panel", "Catálogo"],
                ["promos", "Promociones"],
                ["categories", "Categorías"],
                ["reviews", "Reseñas"],
                ["settings", "Configuración"],
                ...(isRoot ? [["users", "Usuarios"]] : []),
              ] as ["panel" | "promos" | "categories" | "reviews" | "settings" | "users", string][]
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`shrink-0 rounded-full px-4 py-2 transition ${tab === t ? "bg-gold-300 text-ink-950" : "text-white/60 hover:text-gold-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => supabase!.auth.signOut()} className="btn-ghost !px-5 !py-2.5">
            <LogOut className="h-4 w-4" /> Salir
          </button>
        </div>
      </header>

      {legacyMode && (
        <p className="rounded-2xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm text-gold-100">
          Aviso: falta ejecutar <code>supabase/migrations/001_seguridad_y_activo.sql</code> en Supabase. Mientras no lo hagas, el panel
          funciona en modo anterior y no podrás pausar productos.
        </p>
      )}

      {tab === "panel" && (
      <>
      <section className="grid gap-10 lg:grid-cols-[420px_1fr]">
        <form onSubmit={save} className="h-fit space-y-3 rounded-3xl border border-white/10 bg-ink-900 p-6 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">{editingId ? "Editar producto" : "Nuevo producto"}</h2>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="flex items-center gap-1 text-xs text-white/50 hover:text-white">
                <X className="h-3.5 w-3.5" /> Cancelar
              </button>
            )}
          </div>
          <input className="input" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <textarea className="input" rows={3} placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" min={0} placeholder="Precio COP" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input className="input" type="number" min={0} placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
          </div>
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {categories.map((c) => <option key={c} className="bg-ink-900">{c}</option>)}
          </select>
          <input className="input" placeholder="Material (Oro 18k · Diamante)" value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} />
          <div className="space-y-2 rounded-2xl border border-white/10 p-3">
            <p className="text-sm text-white/60">Promoción <span className="text-white/35">(opcional)</span></p>
            <div className="grid grid-cols-3 gap-2">
              <input className="input" type="number" min={1} max={90} step={1} placeholder="% desc." value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} aria-label="Porcentaje de descuento" />
              <input className="input" type="date" value={form.promoStart} onChange={(e) => setForm({ ...form, promoStart: e.target.value })} aria-label="Desde" title="Desde (opcional)" />
              <input className="input" type="date" min={form.promoStart || undefined} value={form.promoEnd} onChange={(e) => setForm({ ...form, promoEnd: e.target.value })} aria-label="Hasta" title="Hasta (opcional)" />
            </div>
            {Number(form.discount) >= 1 && Number(form.discount) <= 90 && Number(form.price) > 0 && (
              <p className="text-xs text-white/45">
                Precio con descuento: <span className="text-gold-300">{formatCOP(finalPrice({ price: Number(form.price), discount_percent: Number(form.discount), promo_start: null, promo_end: null }))}</span>
                {form.promoStart || form.promoEnd ? "" : " · sin fechas: queda activa hasta que la quites"}
              </p>
            )}
          </div>
          <ImageManager
            images={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
            token={token}
            onDiscard={(url) => {
              // Si la imagen es nueva (aún no guardada) se borra ya; si ya era del producto, se borra al guardar.
              if (!originalImages.includes(url)) deleteImages([url], token);
            }}
          />
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Destacado
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Visible en la tienda
            </label>
          </div>
          {msg && <p className="text-sm text-gold-300">{msg}</p>}
          <button disabled={saving} className="btn-gold w-full disabled:opacity-50">
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear producto"}
          </button>
        </form>

        <div className="space-y-3">
          <h2 className="font-serif text-2xl">Productos ({products.length})</h2>
          {products.map((p) => {
            const paused = p.active === false;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 rounded-2xl border bg-ink-900 p-3 transition ${
                  editingId === p.id ? "border-gold-300" : "border-white/5"
                } ${paused ? "opacity-60" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg">
                    {p.name}
                    {paused && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle font-sans text-[10px] uppercase tracking-widest">Pausado</span>}
                  </p>
                  <p className="text-xs text-white/40">
                    {p.category} · stock {p.stock} · {formatCOP(p.price)}
                    {promoStatus(p) && (
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest ${promoStatus(p) === "activa" ? "bg-emerald-400/15 text-emerald-300" : "bg-white/10 text-white/50"}`}>
                        -{p.discount_percent}% · {promoStatus(p)}
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => startEdit(p)} aria-label="Editar" title="Editar" className="rounded-full p-2 text-white/50 hover:text-gold-300">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => toggleActive(p)} aria-label={paused ? "Mostrar en la tienda" : "Pausar"} title={paused ? "Mostrar en la tienda" : "Pausar (ocultar)"} className="rounded-full p-2 text-white/50 hover:text-gold-300">
                  {paused ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button onClick={() => del(p.id)} aria-label="Eliminar" title="Eliminar" className="rounded-full p-2 text-white/40 hover:text-rose-gold">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-5 font-serif text-2xl">Pedidos ({orders.length})</h2>
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="rounded-2xl border border-white/5 bg-ink-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-xl">
                    {o.order_number ? <span className="mr-2 text-gold-300">#{o.order_number}</span> : null}
                    {o.customer_name}
                  </p>
                  <p className="text-xs text-white/40">{o.email} · {o.phone} · {o.city}, {o.address}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={waLink(
                      phoneToWa(o.phone),
                      buildCustomerMessage({
                        number: o.order_number,
                        brand: site.brand_name,
                        customer: o,
                        items: o.items,
                        total: o.total,
                      })
                    )}
                    target="_blank"
                    rel="noreferrer"
                    title="Escribir al cliente por WhatsApp"
                    className="flex items-center gap-2 rounded-full border border-gold-400/30 px-4 py-2 text-xs uppercase tracking-widest text-gold-200 transition hover:border-gold-300"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                  <span className="gold-text font-serif text-xl">{formatCOP(o.total)}</span>
                  <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="input !w-auto !py-2">
                    {["pendiente", "pagado", "enviado", "entregado", "cancelado"].map((s) => <option key={s} className="bg-ink-900">{s}</option>)}
                  </select>
                </div>
              </div>
              <p className="mt-3 text-sm text-white/50">{o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}</p>
              {o.notes && <p className="mt-1 text-sm italic text-white/40">“{o.notes}”</p>}
            </div>
          ))}
          {orders.length === 0 && <p className="text-white/40">Aún no hay pedidos.</p>}
        </div>
      </section>
      </>
      )}

      {tab === "promos" && <PromotionsPanel products={products} categories={categoryNames} onChanged={load} />}

      {tab === "categories" && <CategoriesPanel onChanged={load} />}

      {tab === "reviews" && <ReviewsPanel token={token} />}

      {tab === "settings" && <SettingsPanel token={token} />}

      {tab === "users" && isRoot && <UsersPanel />}
    </div>
  );
}