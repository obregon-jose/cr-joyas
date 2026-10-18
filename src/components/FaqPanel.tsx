"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Faq, FAQ_TOPICS } from "@/lib/faq";

const blank = { topic: FAQ_TOPICS[0], question: "", answer: "" };

// Pestaña "Preguntas": crear, editar, ordenar, ocultar y borrar las preguntas frecuentes.
export default function FaqPanel() {
  const [rows, setRows] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from("faqs").select("*").order("position", { ascending: true });
    if (error) {
      setMsg({
        ok: false,
        text: /faqs/i.test(error.message) ? "Falta ejecutar la migración 012 en Supabase (supabase/migrations/012_preguntas.sql)." : error.message,
      });
    }
    setRows((data as Faq[]) ?? []);
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
      setMsg({ ok: false, text: error.message });
      return false;
    }
    setMsg({ ok: true, text: okText });
    await load();
    return true;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    const payload = { topic: form.topic, question: form.question.trim(), answer: form.answer.trim() };
    if (!payload.question || !payload.answer) return;
    const ok = editing
      ? await run(() => supabase!.from("faqs").update(payload).eq("id", editing), "Pregunta actualizada ✓")
      : await run(
          () => supabase!.from("faqs").insert({ ...payload, position: rows.reduce((m, r) => Math.max(m, r.position), 0) + 1 }),
          "Pregunta creada ✓"
        );
    if (ok) {
      setForm(blank);
      setEditing(null);
    }
  };

  const startEdit = (f: Faq) => {
    setEditing(f.id);
    setForm({ topic: f.topic, question: f.question, answer: f.answer });
    setMsg(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancel = () => {
    setEditing(null);
    setForm(blank);
  };

  const toggle = (f: Faq) =>
    run(() => supabase!.from("faqs").update({ active: !f.active }).eq("id", f.id), f.active ? "Pregunta oculta ✓" : "Pregunta visible ✓");

  const remove = (f: Faq) => {
    if (!confirm("¿Eliminar esta pregunta? Si solo quieres quitarla de la tienda, usa el ojo (ocultar).")) return;
    if (editing === f.id) cancel();
    return run(() => supabase!.from("faqs").delete().eq("id", f.id), "Pregunta eliminada ✓");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const a = rows[index];
    const b = rows[index + dir];
    if (!a || !b || !supabase) return;
    // Se reasignan posiciones según el orden visible para evitar empates.
    await run(async () => {
      const r1 = await supabase!.from("faqs").update({ position: index + dir + 1 }).eq("id", a.id);
      if (r1.error) return r1;
      return supabase!.from("faqs").update({ position: index + 1 }).eq("id", b.id);
    }, "Orden actualizado ✓");
  };

  return (
    <section className="grid gap-10 lg:grid-cols-[420px_1fr]">
      <form onSubmit={save} className="h-fit space-y-3 rounded-3xl border border-white/10 bg-ink-900 p-6 lg:sticky lg:top-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl">{editing ? "Editar pregunta" : "Nueva pregunta"}</h2>
          {editing && (
            <button type="button" onClick={cancel} className="flex items-center gap-1 text-xs text-white/50 hover:text-white">
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
          )}
        </div>
        <select className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
          {(FAQ_TOPICS.includes(form.topic) ? FAQ_TOPICS : [...FAQ_TOPICS, form.topic]).map((t) => (
            <option key={t} className="bg-ink-900">{t}</option>
          ))}
        </select>
        <input className="input" placeholder="Pregunta" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} maxLength={200} required />
        <textarea className="input" rows={5} placeholder="Respuesta" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} maxLength={1500} required />
        {msg && <p className={`text-sm ${msg.ok ? "text-gold-300" : "text-rose-gold"}`}>{msg.text}</p>}
        <button disabled={busy} className="btn-gold w-full disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? null : <Plus className="h-4 w-4" />}
          {editing ? "Guardar cambios" : "Agregar pregunta"}
        </button>
        <p className="text-xs text-white/40">
          El orden de esta lista es el orden en la tienda. Los temas se muestran como pestañas.
        </p>
      </form>

      <div className="space-y-3">
        <h2 className="font-serif text-2xl">Preguntas ({rows.length})</h2>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-gold-300" />}
        {rows.map((f, i) => (
          <div key={f.id} className={`flex items-start gap-3 rounded-2xl border bg-ink-900 p-4 ${editing === f.id ? "border-gold-300" : "border-white/5"} ${f.active ? "" : "opacity-60"}`}>
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Subir" className="rounded p-1 text-white/50 hover:text-gold-300 disabled:opacity-20">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => move(i, 1)} disabled={busy || i === rows.length - 1} aria-label="Bajar" className="rounded p-1 text-white/50 hover:text-gold-300 disabled:opacity-20">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-gold-400">
                {f.topic}
                {!f.active && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-white/60">Oculta</span>}
              </p>
              <p className="mt-1 font-serif text-lg leading-snug">{f.question}</p>
              <p className="mt-1 line-clamp-2 text-sm text-white/45">{f.answer}</p>
            </div>
            <button onClick={() => startEdit(f)} aria-label="Editar" title="Editar" className="rounded-full p-2 text-white/50 hover:text-gold-300"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => toggle(f)} aria-label={f.active ? "Ocultar" : "Mostrar"} title={f.active ? "Ocultar en la tienda" : "Mostrar en la tienda"} className="rounded-full p-2 text-white/50 hover:text-gold-300">
              {f.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
            <button onClick={() => remove(f)} aria-label="Eliminar" title="Eliminar" className="rounded-full p-2 text-white/40 hover:text-rose-gold"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {!loading && rows.length === 0 && !msg && <p className="text-white/40">Aún no hay preguntas.</p>}
      </div>
    </section>
  );
}