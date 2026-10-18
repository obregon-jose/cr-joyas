"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ImageManager from "@/components/admin/ImageManager";
import { deleteImages } from "@/lib/media/delete-images";
import {
  DEFAULT_SETTINGS,
  MARQUEE_ITEM_MAX,
  MARQUEE_MAX,
  SiteSettings,
  cleanMarquee,
  loadSettings,
  publishSettings,
} from "@/lib/site/site-settings";

type TextKey = { [K in keyof SiteSettings]: SiteSettings[K] extends string ? K : never }[keyof SiteSettings];

type Field = { key: TextKey; label: string; hint?: string; long?: boolean };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Marca",
    fields: [
      { key: "brand_name", label: "Nombre de la marca", hint: "Se muestra en mayúsculas en el menú, la intro y el pie de página." },
      { key: "footer_text", label: "Texto del pie de página", hint: "El año se agrega automáticamente." },
    ],
  },
  {
    title: "Contacto",
    fields: [
      { key: "whatsapp", label: "WhatsApp (con indicativo)", hint: "Solo números, ej: 573001234567. Se usa en el botón flotante y en los pedidos." },
      { key: "phone", label: "Teléfono visible" },
      { key: "email", label: "Correo visible" },
      { key: "address", label: "Dirección / ciudad" },
      { key: "hours", label: "Horario" },
      { key: "instagram", label: "Enlace de Instagram", hint: "Pega la URL completa. Si lo dejas vacío, el ícono se oculta." },
    ],
  },
  {
    title: "Portada (hero)",
    fields: [
      { key: "hero_eyebrow", label: "Texto pequeño superior" },
      { key: "hero_title", label: "Título", hint: "Pon entre *asteriscos* las palabras que quieras en dorado. Ej: Brillo que *cuenta* tu *historia*" },
      { key: "hero_text", label: "Descripción", long: true },
      { key: "hero_ring_text", label: "Texto del anillo giratorio", hint: "Las palabras que giran en el círculo dorado del hero. Se repiten solas para dar la vuelta completa; usa \" · \" para separarlas. Déjalo vacío para quitar el anillo." },
      { key: "hero_cta1", label: "Botón principal" },
      { key: "hero_cta2", label: "Botón secundario" },
    ],
  },
];

export default function SettingsPanel({ token }: { token: string | null }) {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [savedHero, setSavedHero] = useState(""); // imagen de portada guardada actualmente

  useEffect(() => {
    loadSettings(true).then((s) => {
      setForm(s);
      setSavedHero(s.hero_image);
      setLoading(false);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMsg("");
    const clean: SiteSettings = { ...form, marquee_items: cleanMarquee(form.marquee_items) };
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, data: clean, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      return setMsg(
        /site_settings/i.test(error.message)
          ? "Falta ejecutar la migración 006 en Supabase (tabla site_settings)."
          : error.message
      );
    }
    // Si la portada cambió, la anterior se borra de ImgBB (si fue subida desde aquí).
    if (savedHero && savedHero !== form.hero_image) deleteImages([savedHero], token);
    setSavedHero(form.hero_image);
    setForm(clean);
    publishSettings(clean);
    setMsg("Configuración guardada ✓ Ya se ve en el sitio.");
  };

  const setItems = (marquee_items: string[]) => setForm((f) => ({ ...f, marquee_items }));
  const moveItem = (i: number, dir: -1 | 1) => {
    const next = [...form.marquee_items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setItems(next);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-gold-300" />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="font-serif text-2xl">Configuración del sitio</h2>
        <p className="mt-1 text-sm text-white/50">Lo que cambies aquí se refleja en la página pública sin tocar código.</p>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.title} className="space-y-4 rounded-3xl border border-white/10 bg-ink-900 p-6">
          <h3 className="eyebrow">{section.title}</h3>
          {section.fields.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-sm text-white/70">{f.label}</span>
              {f.long ? (
                <textarea
                  className="input"
                  rows={4}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              ) : (
                <input className="input" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              )}
              {f.hint && <span className="block text-xs text-white/35">{f.hint}</span>}
            </label>
          ))}
          {section.title.startsWith("Portada") && (
            <div className="space-y-1.5">
              <span className="text-sm text-white/70">Imagen de fondo</span>
              <ImageManager
                images={form.hero_image ? [form.hero_image] : []}
                onChange={(imgs) => setForm({ ...form, hero_image: imgs[0] ?? "" })}
                token={token}
                max={1}
                onDiscard={(url) => {
                  if (url !== savedHero) deleteImages([url], token);
                }}
              />
              <span className="block text-xs text-white/35">Si la quitas, se usa la imagen original. Mejor horizontal y de buena calidad.</span>
            </div>
          )}
        </section>
      ))}

      <section className="space-y-4 rounded-3xl border border-white/10 bg-ink-900 p-6">
        <div>
          <h3 className="eyebrow">Cinta de beneficios</h3>
          <p className="mt-2 text-xs text-white/35">
            Los mensajes que se desplazan bajo la portada. Máximo {MARQUEE_MAX}. Si los repites o son pocos, la cinta se completa sola. Déjala vacía para quitarla.
          </p>
        </div>
        <ul className="space-y-2">
          {form.marquee_items.map((text, i) => (
            <li key={i} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Subir" className="rounded p-0.5 text-white/50 hover:text-gold-300 disabled:opacity-20">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => moveItem(i, 1)} disabled={i === form.marquee_items.length - 1} aria-label="Bajar" className="rounded p-0.5 text-white/50 hover:text-gold-300 disabled:opacity-20">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
              </div>
              <input
                className="input !py-2.5"
                value={text}
                maxLength={MARQUEE_ITEM_MAX}
                placeholder="Ej: Envío asegurado a todo el país"
                onChange={(e) => setItems(form.marquee_items.map((t, k) => (k === i ? e.target.value : t)))}
              />
              <button type="button" onClick={() => setItems(form.marquee_items.filter((_, k) => k !== i))} aria-label="Quitar mensaje" className="rounded-full p-2 text-white/40 hover:text-rose-gold">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {form.marquee_items.length === 0 && <li className="text-sm text-white/40">Sin mensajes: la cinta no se muestra.</li>}
        </ul>
        <button
          type="button"
          disabled={form.marquee_items.length >= MARQUEE_MAX}
          onClick={() => setItems([...form.marquee_items, ""])}
          className="btn-ghost !px-5 !py-2.5 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Agregar mensaje
        </button>
      </section>

      {msg && <p className="text-sm text-gold-300">{msg}</p>}
      <button disabled={saving} className="btn-gold w-full disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}