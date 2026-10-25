"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, EyeOff, Loader2, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { StarsDisplay, StarsInput } from "@/components/ui/StarRating";
import ImageManager from "@/components/admin/ImageManager";
import { deleteImages } from "@/lib/media/delete-images";
import { toast } from "@/lib/ui/toast";

type Status = "pendiente" | "aprobada" | "rechazada";

type Row = {
  id: string;
  product_id: string | null;
  product_name: string | null;
  rating: number;
  customer_name: string;
  comment: string;
  images: string[] | null;
  status: Status;
  verified: boolean;
  source: "cliente" | "admin";
  created_at: string;
};

// Las reseñas se publican solas: aquí solo se ocultan o se vuelven a mostrar. "Pendientes" aparece solo si quedó alguna de antes.
const TABS: { key: Status; label: string }[] = [
  { key: "pendiente", label: "Pendientes" },
  { key: "aprobada", label: "Visibles" },
  { key: "rechazada", label: "Ocultas" },
];

const fmt = (iso: string) => new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

export default function ReviewsPanel({ token }: { token: string | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [tab, setTab] = useState<Status>("aprobada");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [r, p] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,name").order("name"),
    ]);
    if (r.error) {
      toast.error(/reviews/i.test(r.error.message) ? "Falta ejecutar la migración 009 en Supabase (tabla reviews)." : r.error.message);
    } else {
      setRows((r.data as Row[]) ?? []);
    }
    setProducts((p.data as { id: string; name: string }[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { pendiente: 0, aprobada: 0, rechazada: 0 };
    rows.forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const setStatus = async (id: string, status: Status) => {
    const { error } = await supabase!.from("reviews").update({ status, moderated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const remove = async (r: Row) => {
    if (!confirm("¿Eliminar esta reseña definitivamente? Sus fotos también se borrarán.")) return;
    const { error } = await supabase!.from("reviews").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    deleteImages(r.images ?? [], token);
    setRows((rs) => rs.filter((x) => x.id !== r.id));
  };

  const visible = rows.filter((r) => r.status === tab);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex rounded-full border border-white/10 p-1 text-xs uppercase tracking-widest">
          {TABS.filter((t) => t.key !== "pendiente" || counts.pendiente > 0).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${tab === t.key ? "bg-gold-300 text-ink-950" : "text-white/60 hover:text-gold-200"}`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 text-[10px] ${tab === t.key ? "bg-ink-950/15" : "bg-white/10"} ${t.key === "pendiente" && counts.pendiente > 0 && tab !== t.key ? "!bg-gold-300 text-ink-950" : ""}`}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>
        <button onClick={() => setAdding((v) => !v)} className="btn-ghost !px-5 !py-2.5">
          {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {adding ? "Cerrar" : "Agregar reseña"}
        </button>
      </div>

      {adding && (
        <NewReview
          products={products}
          token={token}
          onSaved={() => {
            setAdding(false);
            setTab("aprobada");
            load();
          }}
        />
      )}


      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
        </div>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-white/40">No hay reseñas en esta lista.</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((r) => (
            <li key={r.id} className="rounded-2xl border border-white/5 bg-ink-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <StarsDisplay value={Number(r.rating)} size={18} />
                  <p className="mt-2 text-sm text-white/90">
                    {r.customer_name}
                  </p>
                  <p className="mt-0.5 text-xs text-white/35">{fmt(r.created_at)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
                  {r.verified ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-gold-400/30 px-2.5 py-1 text-gold-200">
                      <ShieldCheck className="h-3 w-3" /> Compra verificada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1 text-white/50">
                      <UserRound className="h-3 w-3" /> Agregada por el admin
                    </span>
                  )}
                  {r.product_name && <span className="rounded-full bg-white/[0.06] px-2.5 py-1 normal-case tracking-normal text-white/60">{r.product_name}</span>}
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/75">{r.comment}</p>

              {(r.images ?? []).length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {(r.images ?? []).map((u) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt="Foto de la reseña" className="h-20 w-20 rounded-xl border border-white/10 object-cover transition hover:border-gold-300" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {r.status !== "aprobada" && (
                  <button onClick={() => setStatus(r.id, "aprobada")} className="flex items-center gap-2 rounded-full bg-gold-300 px-4 py-2 text-xs font-medium uppercase tracking-widest text-ink-950 transition hover:bg-gold-200">
                    <Check className="h-4 w-4" /> Mostrar
                  </button>
                )}
                {r.status !== "rechazada" && (
                  <button onClick={() => setStatus(r.id, "rechazada")} className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-widest text-white/70 transition hover:border-gold-300 hover:text-gold-200">
                    <EyeOff className="h-4 w-4" /> Ocultar
                  </button>
                )}
                <button onClick={() => remove(r)} className="ml-auto flex items-center gap-2 rounded-full px-3 py-2 text-xs uppercase tracking-widest text-white/40 transition hover:text-rose-gold">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Reseña creada por el admin (por ejemplo, un comentario recibido por WhatsApp). Se publica de una vez, sin sello de compra verificada. */
function NewReview({ products, token, onSaved }: { products: { id: string; name: string }[]; token: string | null; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [productId, setProductId] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 0.5) return toast.error("Elige la calificación");
    setSaving(true);
    const product = products.find((p) => p.id === productId);
    const { error: err } = await supabase!.from("reviews").insert({
      product_id: product?.id ?? null,
      product_name: product?.name ?? null,
      rating,
      customer_name: name.trim(),
      comment: comment.trim(),
      images,
      status: "aprobada",
      verified: false,
      source: "admin",
      moderated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (err) return toast.error(err.message);
    onSaved();
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-3xl border border-white/10 bg-ink-900 p-6">
      <h3 className="font-serif text-2xl">Nueva reseña</h3>
      <input className="input" placeholder="Nombre del cliente" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={60} />
      <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>
        <option value="" className="bg-ink-900">Sin pieza asociada</option>
        {products.map((p) => <option key={p.id} value={p.id} className="bg-ink-900">{p.name}</option>)}
      </select>
      <div>
        <StarsInput value={rating} onChange={setRating} size={34} />
      </div>
      <textarea className="input" rows={4} placeholder="Comentario" value={comment} onChange={(e) => setComment(e.target.value)} required minLength={10} maxLength={1000} />
      <ImageManager images={images} onChange={setImages} token={token} max={5} />
      <button disabled={saving} className="btn-gold w-full disabled:opacity-50">{saving ? "Guardando..." : "Publicar reseña"}</button>
    </form>
  );
}