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
  STATS_MAX,
  STAT_LABEL_MAX,
  STAT_SUFFIX_MAX,
  STAT_VALUE_MAX,
  SiteSettings,
  cleanMarquee,
  cleanStats,
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
      { key: "instagram", label: "Instagram", hint: "Pega el enlace o escribe solo el usuario (ej: @crjoyas). Si lo dejas vacío, el ícono se oculta." },
      { key: "facebook", label: "Facebook", hint: "Enlace de tu página o solo el nombre de usuario. Vacío = sin ícono." },
      { key: "tiktok", label: "TikTok", hint: "Enlace o usuario (ej: @crjoyas). Vacío = sin ícono." },
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
  {
    title: "Atelier",
    fields: [
      { key: "atelier_eyebrow", label: "Texto pequeño superior" },
      { key: "atelier_title", label: "Título", hint: "Pon entre *asteriscos* las palabras en dorado. Ej: Cada joya, una *obra de arte*" },
      { key: "atelier_text", label: "Descripción", long: true },
      { key: "atelier_badge", label: "Sello giratorio", hint: "El texto del círculo que gira sobre las fotos. Vacío = sin sello." },
    ],
  },
];

const ATELIER_IMAGES: { key: "atelier_image1" | "atelier_image2"; label: string }[] = [
  { key: "atelier_image1", label: "Foto grande (arriba a la izquierda)" },
  { key: "atelier_image2", label: "Foto pequeña (abajo a la derecha)" },
];

const MEDIA_KEYS = ["hero_image", "atelier_image1", "atelier_image2"] as const;
const pickMedia = (s: SiteSettings) => ({ hero_image: s.hero_image, atelier_image1: s.atelier_image1, atelier_image2: s.atelier_image2 });

export default function SettingsPanel({ token }: { token: string | null }) {
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [saved, setSaved] = useState(pickMedia(DEFAULT_SETTINGS)); // imágenes guardadas actualmente (para borrar las reemplazadas)

  useEffect(() => {
    loadSettings(true).then((s) => {
      setForm(s);
      setSaved(pickMedia(s));
      setLoading(false);
    });
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setMsg("");
    const clean: SiteSettings = { ...form, marquee_items: cleanMarquee(form.marquee_items), atelier_stats: cleanStats(form.atelier_stats) };
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
    // Si una imagen cambió, la anterior se borra de ImgBB (si fue subida desde aquí).
    for (const k of MEDIA_KEYS) if (saved[k] && saved[k] !== form[k]) deleteImages([saved[k]], token);
    setSaved(pickMedia(form));
    setForm(clean);
    publishSettings(clean);
    setMsg("Configuración guardada ✓ Ya se ve en el sitio.");
  };

  const setItems = (marquee_items: string[]) => setForm((f) => ({ ...f, marquee_items }));
  const setStats = (atelier_stats: SiteSettings["atelier_stats"]) => setForm((f) => ({ ...f, atelier_stats }));
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
                  if (url !== saved.hero_image) deleteImages([url], token);
                }}
              />
              <span className="block text-xs text-white/35">Si la quitas, se usa la imagen original. Mejor horizontal y de buena calidad.</span>
            </div>
          )}
          {section.title === "Atelier" &&
            ATELIER_IMAGES.map((im) => (
              <div key={im.key} className="space-y-1.5">
                <span className="text-sm text-white/70">{im.label}</span>
                <ImageManager
                  images={form[im.key] ? [form[im.key]] : []}
                  onChange={(imgs) => setForm({ ...form, [im.key]: imgs[0] ?? "" })}
                  token={token}
                  max={1}
                  onDiscard={(url) => {
                    if (url !== saved[im.key]) deleteImages([url], token);
                  }}
                />
              </div>
            ))}
          {section.title === "Atelier" && (
            <span className="block text-xs text-white/35">Si quitas una foto, se usa la original.</span>
          )}
        </section>
      ))}

      <section className="space-y-4 rounded-3xl border border-white/10 bg-ink-900 p-6">
        <div>
          <h3 className="eyebrow">Cifras del atelier</h3>
          <p className="mt-2 text-xs text-white/35">
            Números que cuentan al aparecer en pantalla. Máximo {STATS_MAX}. Símbolo opcional (+, %). Déjalas vacías para quitarlas.
          </p>
        </div>
        <ul className="space-y-3">
          {form.atelier_stats.map((st, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={STAT_VALUE_MAX}
                className="input !w-28 !py-2.5"
                value={Number.isFinite(st.value) ? st.value : 0}
                aria-label="Número"
                onChange={(e) => setStats(form.atelier_stats.map((x, k) => (k === i ? { ...x, value: Number(e.target.value) } : x)))}
              />
              <input
                className="input !w-16 !py-2.5 text-center"
                value={st.suffix}
                maxLength={STAT_SUFFIX_MAX}
                placeholder="+"
                aria-label="Símbolo"
                onChange={(e) => setStats(form.atelier_stats.map((x, k) => (k === i ? { ...x, suffix: e.target.value } : x)))}
              />
              <input
                className="input !min-w-[10rem] flex-1 !py-2.5"
                value={st.label}
                maxLength={STAT_LABEL_MAX}
                placeholder="Ej: Años de maestría"
                aria-label="Descripción"
                onChange={(e) => setStats(form.atelier_stats.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))}
              />
              <button type="button" onClick={() => setStats(form.atelier_stats.filter((_, k) => k !== i))} aria-label="Quitar cifra" className="rounded-full p-2 text-white/40 hover:text-rose-gold">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {form.atelier_stats.length === 0 && <li className="text-sm text-white/40">Sin cifras: no se muestra esa parte.</li>}
        </ul>
        <button
          type="button"
          disabled={form.atelier_stats.length >= STATS_MAX}
          onClick={() => setStats([...form.atelier_stats, { value: 0, suffix: "", label: "" }])}
          className="btn-ghost !px-5 !py-2.5 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" /> Agregar cifra
        </button>
      </section>

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