"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ImageManager from "@/components/admin/ImageManager";
import { DEFAULT_SETTINGS, SiteSettings, loadSettings, publishSettings } from "@/lib/site/site-settings";
import { deleteImages } from "@/lib/media/delete-images";

type Field = { key: keyof SiteSettings; label: string; hint?: string; long?: boolean };


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
  const [savedHero, setSavedHero] = useState("");

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
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: 1, data: form, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      return setMsg(
        /site_settings/i.test(error.message)
          ? "Falta ejecutar la migración 006 en Supabase (tabla site_settings)."
          : error.message
      );
    }
    if (savedHero && savedHero !== form.hero_image) deleteImages([savedHero], token);
setSavedHero(form.hero_image);
    publishSettings(form);
    setMsg("Configuración guardada ✓ Ya se ve en el sitio.");
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
              />
              <span className="block text-xs text-white/35">Si la quitas, se usa la imagen original. Mejor horizontal y de buena calidad.</span>
            </div>
          )}
        </section>
      ))}

      {msg && <p className="text-sm text-gold-300">{msg}</p>}
      <button disabled={saving} className="btn-gold w-full disabled:opacity-50">
        {saving ? "Guardando..." : "Guardar configuración"}
      </button>
    </form>
  );
}