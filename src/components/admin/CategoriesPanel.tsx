"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/lib/types";
import ImageManager from "@/components/admin/ImageManager";
import { deleteImages } from "@/lib/media/delete-images";
import { toast } from "@/lib/ui/toast";

// Pestaña "Categorías": crear, editar (nombre, frase y foto con el lápiz), ordenar, ocultar y borrar.
export default function CategoriesPanel({ onChanged, token }: { onChanged: () => void; token: string | null }) {
  const [rows, setRows] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  // Formulario de "Nueva categoría"
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [image, setImage] = useState<string[]>([]);
  // Edición: una categoría a la vez, con todos sus datos
  const [editing, setEditing] = useState<string | null>(null); // id de la categoría que se edita
  const [editName, setEditName] = useState("");
  const [dTagline, setDTagline] = useState("");
  const [dImage, setDImage] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("position", { ascending: true }),
      supabase.from("products").select("category"),
    ]);
    if (c.error) {
      const missing = /categories/i.test(c.error.message);
      toast.error(missing ? "Falta ejecutar la migración 004 en Supabase (supabase/migrations/004_categorias.sql)." : c.error.message);
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

  const errorText = (message: string) =>
    message.includes("duplicate")
      ? "Ya existe una categoría con ese nombre"
      : /tagline|image_url/i.test(message)
        ? "Falta ejecutar la migración 013 en Supabase (supabase/migrations/013_colecciones.sql)."
        : message;

  const run = async (action: () => PromiseLike<{ error: { message: string } | null }>, okText: string) => {
    setBusy(true);
    const { error } = await action();
    setBusy(false);
    if (error) {
      toast.error(errorText(error.message));
      return false;
    }
    toast.success(okText);
    await load();
    onChanged();
    return true;
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n || !supabase) return;
    const next = rows.reduce((m, r) => Math.max(m, r.position), 0) + 1;
    const ok = await run(
      () => supabase!.from("categories").insert({ name: n, position: next, tagline: tagline.trim() || null, image_url: image[0] ?? null }),
      `Categoría "${n}" creada ✓`
    );
    if (ok) {
      setName("");
      setTagline("");
      setImage([]);
    }
  };

  const startEdit = (c: Category) => {
    // Si había otra categoría en edición con una foto nueva sin guardar, se descarta.
    const prev = rows.find((r) => r.id === editing);
    if (editing && editing !== c.id) deleteImages(dImage.filter((u) => u !== prev?.image_url), token);
    setEditing(c.id);
    setEditName(c.name);
    setDTagline(c.tagline ?? "");
    setDImage(c.image_url ? [c.image_url] : []);
  };

  const cancelEdit = (c: Category) => {
    // Una foto recién subida que no se llegó a guardar se borra de ImgBB.
    deleteImages(dImage.filter((u) => u !== c.image_url), token);
    setEditing(null);
  };

  // Un solo guardado para todo: nombre (se renombra también en sus productos), frase y foto.
  const saveEdit = async (c: Category) => {
    if (!supabase) return;
    const n = editName.trim();
    if (!n) return toast.error("La categoría necesita un nombre");
    const newImg = dImage[0] ?? null;
    setBusy(true);
    let error: { message: string } | null = null;
    if (n !== c.name) ({ error } = await supabase.rpc("rename_category", { p_old: c.name, p_new: n }));
    if (!error) ({ error } = await supabase.from("categories").update({ tagline: dTagline.trim() || null, image_url: newImg }).eq("id", c.id));
    setBusy(false);
    if (error) {
      toast.error(errorText(error.message));
      await load();
      return;
    }
    // La foto anterior se borra de ImgBB si fue reemplazada o quitada.
    if (c.image_url && c.image_url !== newImg) deleteImages([c.image_url], token);
    toast.success(n !== c.name ? `Guardada como "${n}" ✓ (también en sus productos)` : "Categoría actualizada ✓");
    setEditing(null);
    await load();
    onChanged();
  };

  const toggle = (c: Category) =>
    run(() => supabase!.from("categories").update({ active: !c.active }).eq("id", c.id), c.active ? "Categoría oculta ✓" : "Categoría visible ✓");

  const remove = (c: Category) => {
    if (!confirm(`¿Eliminar la categoría "${c.name}"?`)) return;
    const img = c.image_url;
    return run(() => supabase!.rpc("delete_category", { p_name: c.name }), "Categoría eliminada ✓").then((ok) => {
      if (ok && img) deleteImages([img], token); // la foto de la colección ya no se usa
      return ok;
    });
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

  const iconBtn = "rounded-full p-2 text-white/50 transition hover:text-gold-300 disabled:cursor-not-allowed disabled:opacity-20";

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)] lg:items-start lg:gap-10">
      <form onSubmit={add} className="h-fit space-y-3 rounded-3xl border border-white/10 bg-ink-900 p-5 sm:p-6 lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl">Nueva categoría</h2>
        <input className="input" placeholder="Ej: Relojes" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Frase de la colección (opcional)" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={50} />
        <div className="space-y-1.5">
          <span className="text-sm text-white/60">Foto de la colección (opcional)</span>
          <ImageManager images={image} onChange={setImage} token={token} max={1} onDiscard={(url) => deleteImages([url], token)} />
        </div>
        <button disabled={busy} className="btn-gold w-full disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear categoría
        </button>
        <p className="text-xs text-white/40">
          El orden de esta lista es el orden de los filtros en la tienda. Ocultar una categoría esconde también sus productos.
          En la portada se muestran 4 colecciones a la vez; si tienes más, van alternando solas.
        </p>
      </form>

      <div className="min-w-0 space-y-3">
        <h2 className="font-serif text-2xl">Categorías ({rows.length})</h2>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-gold-300" />}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
          {rows.map((c, i) => {
            const used = counts[c.name] ?? 0;
            const isEditing = editing === c.id;
            return (
              <div
                key={c.id}
                className={`min-w-0 rounded-2xl border bg-ink-900 p-3.5 sm:p-4 ${
                  isEditing ? "border-gold-300/40 sm:col-span-2 lg:col-span-1 2xl:col-span-2" : "border-white/5"
                } ${c.active || isEditing ? "" : "opacity-60"}`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <p className="eyebrow">Editando categoría</p>
                    <input
                      autoFocus
                      className="input"
                      placeholder="Nombre"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(c);
                        if (e.key === "Escape") cancelEdit(c);
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Frase de la colección (ej: Luz en cada gesto)"
                      value={dTagline}
                      onChange={(e) => setDTagline(e.target.value)}
                      maxLength={50}
                    />
                    <div className="space-y-1.5">
                      <span className="text-sm text-white/60">Foto de la colección</span>
                      <ImageManager
                        images={dImage}
                        onChange={setDImage}
                        token={token}
                        max={1}
                        onDiscard={(url) => {
                          // Una foto recién subida que se descarta se borra ya; la que ya tenía la categoría se borra al guardar.
                          if (url !== c.image_url) deleteImages([url], token);
                        }}
                      />
                    </div>
                    <p className="text-xs text-white/35">
                      Si no tiene foto, se usa la de su producto más reciente. Mejor horizontal y de buena calidad. Si cambias el nombre, también se
                      cambia en sus {used} {used === 1 ? "producto" : "productos"}.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => saveEdit(c)} disabled={busy} className="btn-gold !px-6 !py-2.5 disabled:opacity-50">
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
                      </button>
                      <button onClick={() => cancelEdit(c)} disabled={busy} className="btn-ghost !px-6 !py-2.5">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Miniatura de la foto de la colección */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-800 sm:h-[72px] sm:w-[72px]">
                      {c.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-white/20">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-lg leading-tight">{c.name}</p>
                      {c.tagline && <p className="truncate text-xs italic text-white/45">{c.tagline}</p>}
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-white/40">
                        <span>
                          {used} {used === 1 ? "producto" : "productos"}
                        </span>
                        {!c.active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-widest">Oculta</span>}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-0.5 sm:flex-row sm:items-center">
                      <div className="flex">
                        <button onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Subir" title="Subir" className={iconBtn}>
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1} aria-label="Bajar" title="Bajar" className={iconBtn}>
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex">
                        <button onClick={() => startEdit(c)} aria-label="Editar" title="Editar nombre, frase y foto" className={iconBtn}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggle(c)}
                          aria-label={c.active ? "Ocultar" : "Mostrar"}
                          title={c.active ? "Ocultar en la tienda" : "Mostrar en la tienda"}
                          className={iconBtn}
                        >
                          {c.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => remove(c)}
                          disabled={used > 0}
                          aria-label="Eliminar"
                          title={used > 0 ? "Tiene productos: ocúltala en vez de borrarla" : "Eliminar"}
                          className="rounded-full p-2 text-white/40 transition hover:text-rose-gold disabled:cursor-not-allowed disabled:opacity-20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!loading && rows.length === 0 && <p className="text-white/40">Aún no hay categorías.</p>}
      </div>
    </section>
  );
}