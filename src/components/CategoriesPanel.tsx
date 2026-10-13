"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/lib/types";

// Pestaña "Categorías": crear, renombrar, ordenar, ocultar y borrar. La ven todos los administradores.
export default function CategoriesPanel({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("position", { ascending: true }),
      supabase.from("products").select("category"),
    ]);
    if (c.error) {
      const missing = /categories/i.test(c.error.message);
      setMsg({
        ok: false,
        text: missing ? "Falta ejecutar la migración 004 en Supabase (supabase/migrations/004_categorias.sql)." : c.error.message,
      });
    }
    const map: Record<string, number> = {};
    (p.data ?? []).forEach((r: { category: string }) => {
      map[r.category] = (map[r.category] ?? 0) + 1;
    });
    setRows((c.data as Category[]) ?? []);
    setCounts(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => PromiseLike<{ error: { message: string } | null }>, okText: string) => {
    setBusy(true);
    setMsg(null);
    const { error } = await action();
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: error.message.includes("duplicate") ? "Ya existe una categoría con ese nombre" : error.message });
      return false;
    }
    setMsg({ ok: true, text: okText });
    await load();
    onChanged();
    return true;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || !supabase) return;
    const next = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1;
    const ok = await run(() => supabase!.from("categories").insert({ name: n, position: next }), `Categoría "${n}" creada ✓`);
    if (ok) setName("");
  };

  const rename = async (old: string) => {
    const n = editName.trim();
    if (!supabase) return;
    if (!n || n === old) return setEditing(null);
    const ok = await run(() => supabase!.rpc("rename_category", { p_old: old, p_new: n }), `Renombrada a "${n}" ✓ (también en sus productos)`);
    if (ok) setEditing(null);
  };

  const toggle = (c: Category) =>
    run(() => supabase!.from("categories").update({ active: !c.active }).eq("id", c.id), c.active ? "Categoría oculta ✓" : "Categoría visible ✓");

  const remove = (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    return run(() => supabase!.rpc("delete_category", { p_name: c.name }), "Categoría eliminada ✓");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b || !supabase) return;
    // Si tienen la misma posición (datos iniciales), se reasignan según el orden actual de la lista.
    const posA = index + 1;
    const posB = index + dir + 1;
    await run(async () => {
      const r1 = await supabase!.from("categories").update({ position: posB }).eq("id", a.id);
      if (r1.error) return r1;
      return supabase!.from("categories").update({ position: posA }).eq("id", b.id);
    }, "Orden actualizado ✓");
  };

  return (
    <section className="grid gap-10 lg:grid-cols-[420px_1fr]">
      <form onSubmit={add} className="h-fit space-y-3 rounded-3xl border border-white/10 bg-ink-900 p-6">
        <h2 className="font-serif text-2xl">Nueva categoría</h2>
        <input className="input" placeholder="Ej: Relojes" value={name} onChange={(e) => setName(e.target.value)} required />
        {msg && <p className={`text-sm ${msg.ok ? "text-gold-300" : "text-rose-gold"}`}>{msg.text}</p>}
        <button disabled={busy} className="btn-gold w-full disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear categoría
        </button>
        <p className="text-xs text-white/40">
          El orden de esta lista es el orden de los filtros en la tienda. Ocultar una categoría esconde también sus productos.
        </p>
      </form>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl">Categorías ({rows.length})</h2>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-gold-300" />}
        {rows.map((c, i) => {
          const used = counts[c.name] ?? 0;
          return (
            <div key={c.id} className={`flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-ink-900 p-4 ${c.active ? "" : "opacity-60"}`}>
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Subir" className="rounded p-1 text-white/50 hover:text-gold-300 disabled:opacity-20">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1} aria-label="Bajar" className="rounded p-1 text-white/50 hover:text-gold-300 disabled:opacity-20">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                {editing === c.name ? (
                  <input
                    autoFocus
                    className="input !py-2"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") rename(c.name);
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                ) : (
                  <>
                    <p className="truncate font-serif text-lg">
                      {c.name}
                      {!c.active && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 align-middle font-sans text-[10px] uppercase tracking-widest">Oculta</span>}
                    </p>
                    <p className="text-xs text-white/40">{used} {used === 1 ? "producto" : "productos"}</p>
                  </>
                )}
              </div>

              {editing === c.name ? (
                <>
                  <button onClick={() => rename(c.name)} aria-label="Guardar" className="rounded-full p-2 text-gold-300"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(null)} aria-label="Cancelar" className="rounded-full p-2 text-white/50"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditing(c.name); setEditName(c.name); }} aria-label="Renombrar" title="Renombrar" className="rounded-full p-2 text-white/50 hover:text-gold-300"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => toggle(c)} aria-label={c.active ? "Ocultar" : "Mostrar"} title={c.active ? "Ocultar en la tienda" : "Mostrar en la tienda"} className="rounded-full p-2 text-white/50 hover:text-gold-300">
                    {c.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => remove(c)}
                    disabled={used > 0}
                    aria-label="Eliminar"
                    title={used > 0 ? "Tiene productos: ocúltala en vez de borrarla" : "Eliminar"}
                    className="rounded-full p-2 text-white/40 hover:text-rose-gold disabled:cursor-not-allowed disabled:opacity-20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          );
        })}
        {!loading && rows.length === 0 && !msg && <p className="text-white/40">Aún no hay categorías.</p>}
      </div>
    </section>
  );
}