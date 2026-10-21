"use client";

import { useMemo, useState } from "react";
import { Loader2, Percent, Pencil, Tag, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCOP } from "@/lib/format";
import { Product } from "@/lib/types";
import { finalPrice, fromDateInput, promoRange, promoStatus, PromoStatus, toDateInput } from "@/lib/catalog/promo";
import { toast } from "@/lib/ui/toast";

type Props = { products: Product[]; categories: string[]; onChanged: () => void };

const STATUS_LABEL: Record<PromoStatus, string> = { activa: "Activa", programada: "Programada", vencida: "Vencida" };
const STATUS_STYLE: Record<PromoStatus, string> = {
  activa: "bg-emerald-400/15 text-emerald-300",
  programada: "bg-gold-300/15 text-gold-200",
  vencida: "bg-white/10 text-white/50",
};

type Scope = "all" | "category" | "pick";

export default function PromotionsPanel({ products, categories, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<"todas" | PromoStatus>("todas");
  const [editing, setEditing] = useState<string | null>(null);

  // Formulario compartido: crear una promoción nueva o editar una existente.
  const [pct, setPct] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Alcance de una promoción nueva.
  const [scope, setScope] = useState<Scope>("pick");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [picked, setPicked] = useState<string[]>([]);

  const withPromo = useMemo(() => products.filter((p) => promoStatus(p)), [products]);
  const counts = useMemo(() => {
    const c: Record<PromoStatus, number> = { activa: 0, programada: 0, vencida: 0 };
    withPromo.forEach((p) => (c[promoStatus(p) as PromoStatus] += 1));
    return c;
  }, [withPromo]);
  const shownList = withPromo.filter((p) => filter === "todas" || promoStatus(p) === filter);

  const targets = useMemo(() => {
    if (scope === "all") return products;
    if (scope === "category") return products.filter((p) => p.category === category);
    return products.filter((p) => picked.includes(p.id));
  }, [scope, category, picked, products]);

  const percent = Number(pct);
  const valid = Number.isInteger(percent) && percent >= 1 && percent <= 90 && (!start || !end || start <= end);

  const reset = () => {
    setPct("");
    setStart("");
    setEnd("");
    setEditing(null);
  };

  const run = async (ids: string[], patch: Record<string, unknown>, ok: string) => {
    if (!supabase || ids.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("products").update(patch).in("id", ids);
    setBusy(false);
    if (error) {
      const missing = /discount_percent|promo_/i.test(error.message);
      return toast.error(missing ? "Falta ejecutar la migración 011_promociones.sql en Supabase." : error.message);
    }
    toast.success(ok);
    onChanged();
  };

  const patchFromForm = () => ({
    discount_percent: percent,
    promo_start: fromDateInput(start, "start"),
    promo_end: fromDateInput(end, "end"),
  });

  const apply = async () => {
    if (!valid) return;
    const ids = targets.map((p) => p.id);
    if (ids.length === 0) return toast.error("Elige al menos una pieza.");
    await run(ids, patchFromForm(), `Promoción aplicada a ${ids.length} ${ids.length === 1 ? "pieza" : "piezas"} ✓`);
    setPicked([]);
    reset();
  };

  const saveEdit = async () => {
    if (!valid || !editing) return;
    await run([editing], patchFromForm(), "Promoción actualizada ✓");
    reset();
  };

  const startEdit = (p: Product) => {
    setEditing(p.id);
    setPct(String(p.discount_percent ?? ""));
    setStart(toDateInput(p.promo_start));
    setEnd(toDateInput(p.promo_end));
  };

  const clearPromo = (ids: string[], ok: string) =>
    run(ids, { discount_percent: null, promo_start: null, promo_end: null }, ok);

  const fields = (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="space-y-1.5">
        <span className="text-sm text-white/60">Descuento (%)</span>
        <div className="relative">
          <input className="input !pr-9" type="number" min={1} max={90} step={1} placeholder="20" value={pct} onChange={(e) => setPct(e.target.value)} />
          <Percent className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        </div>
      </label>
      <label className="space-y-1.5">
        <span className="text-sm text-white/60">Desde (opcional)</span>
        <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </label>
      <label className="space-y-1.5">
        <span className="text-sm text-white/60">Hasta (opcional)</span>
        <input className="input" type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} />
      </label>
    </div>
  );

  const chip = (on: boolean) =>
    `rounded-full border px-4 py-2 text-xs uppercase tracking-widest transition ${on ? "border-gold-300 bg-gold-300 text-ink-950" : "border-white/10 text-white/60 hover:text-gold-200"}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[420px_1fr]">
      {/* Nueva promoción */}
      <section className="h-fit space-y-4 rounded-3xl border border-white/10 bg-ink-900 p-6 lg:sticky lg:top-6">
        <h2 className="flex items-center gap-2 font-serif text-2xl">
          <Tag className="h-5 w-5 text-gold-300" /> Nueva promoción
        </h2>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setScope("pick")} className={chip(scope === "pick")}>Elegir piezas</button>
          <button type="button" onClick={() => setScope("category")} className={chip(scope === "category")}>Una categoría</button>
          <button type="button" onClick={() => setScope("all")} className={chip(scope === "all")}>Toda la tienda</button>
        </div>

        {scope === "category" && (
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} className="bg-ink-900">{c}</option>)}
          </select>
        )}

        {scope === "pick" && (
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-white/10 p-2">
            {products.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 text-sm hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={picked.includes(p.id)}
                  onChange={(e) => setPicked((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-xs text-white/40">{formatCOP(p.price)}</span>
              </label>
            ))}
            {products.length === 0 && <p className="p-3 text-sm text-white/40">Aún no hay productos.</p>}
          </div>
        )}

        {fields}

        {valid && targets.length > 0 && (
          <p className="text-xs text-white/45">
            Se aplicará -{percent}% a {targets.length} {targets.length === 1 ? "pieza" : "piezas"}. Reemplaza cualquier promoción que ya tengan.
          </p>
        )}
        {pct && !valid && <p className="text-xs text-rose-gold">El descuento debe ser un número entero entre 1 y 90, y la fecha final no puede ser anterior a la inicial.</p>}

        <button onClick={apply} disabled={!valid || busy || targets.length === 0} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-40">
          {busy && !editing ? "Aplicando..." : "Aplicar promoción"}
        </button>
      </section>

      {/* Promociones existentes */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Promociones ({withPromo.length})</h2>
          {counts.vencida > 0 && (
            <button
              onClick={() => confirm("¿Quitar todas las promociones vencidas?") && clearPromo(withPromo.filter((p) => promoStatus(p) === "vencida").map((p) => p.id), "Promociones vencidas retiradas ✓")}
              className="text-xs uppercase tracking-widest text-white/40 transition hover:text-rose-gold"
            >
              Limpiar vencidas
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("todas")} className={chip(filter === "todas")}>Todas</button>
          {(Object.keys(STATUS_LABEL) as PromoStatus[]).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={chip(filter === s)}>
              {STATUS_LABEL[s]} ({counts[s]})
            </button>
          ))}
        </div>


        {shownList.map((p) => {
          const st = promoStatus(p) as PromoStatus;
          const isEditing = editing === p.id;
          return (
            <div key={p.id} className={`rounded-2xl border bg-ink-900 p-4 ${isEditing ? "border-gold-300" : "border-white/5"} ${st === "vencida" ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-serif text-lg">
                    {p.name}
                    <span className={`ml-2 rounded-full px-2 py-0.5 align-middle font-sans text-[10px] uppercase tracking-widest ${STATUS_STYLE[st]}`}>{STATUS_LABEL[st]}</span>
                  </p>
                  <p className="text-sm">
                    <span className="text-gold-300">-{p.discount_percent}%</span>
                    <span className="text-white/40"> · </span>
                    <span className="text-white/40 line-through">{formatCOP(p.price)}</span>
                    <span className="text-white/80"> → {formatCOP(finalPrice({ ...p, promo_start: null, promo_end: null }))}</span>
                  </p>
                  <p className="text-xs text-white/40">{promoRange(p)}</p>
                </div>
                <button onClick={() => (isEditing ? reset() : startEdit(p))} aria-label="Editar promoción" title="Editar promoción" className="rounded-full p-2 text-white/50 hover:text-gold-300">
                  {isEditing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </button>
                <button onClick={() => clearPromo([p.id], "Promoción retirada ✓")} className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-widest text-white/50 transition hover:border-rose-gold/50 hover:text-rose-gold">
                  Quitar
                </button>
              </div>

              {isEditing && (
                <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                  {fields}
                  <button onClick={saveEdit} disabled={!valid || busy} className="btn-gold !px-6 !py-2.5 disabled:opacity-40">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar cambios"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {shownList.length === 0 && (
          <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-white/40">
            {withPromo.length === 0 ? "Todavía no hay promociones. Crea la primera desde el formulario." : "No hay promociones en este estado."}
          </p>
        )}
      </section>
    </div>
  );
}