"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import ImageManager from "@/components/admin/ImageManager";
import { deleteImages } from "@/lib/media/delete-images";
import { Variant } from "@/lib/types";

// Editor de opciones del producto (colores, tallas...) dentro del formulario de producto (migración 019).

export type VariantForm = {
  key: string; // identifica la tarjeta en pantalla
  id?: string; // existe solo si la opción ya estaba guardada
  name: string;
  color: string; // "#RRGGBB" o vacío
  images: string[];
  stock: string;
  unlimited: boolean;
  price: string; // vacío = usa el precio del producto
  active: boolean;
};

let seq = 0;
export const newVariantForm = (): VariantForm => ({
  key: `n${Date.now()}-${seq++}`,
  name: "",
  color: "",
  images: [],
  stock: "1",
  unlimited: false,
  price: "",
  active: true,
});

export const toVariantForms = (list: Variant[] | undefined): VariantForm[] =>
  (list ?? []).map((v) => ({
    key: v.id,
    id: v.id,
    name: v.name,
    color: v.color ?? "",
    images: v.images ?? [],
    stock: String(v.stock),
    unlimited: v.unlimited_stock === true,
    price: v.price == null ? "" : String(v.price),
    active: v.active !== false,
  }));

/** Devuelve un mensaje de error en español, o null si todo está bien. */
export function validateVariants(list: VariantForm[]): string | null {
  const seen = new Set<string>();
  for (const [i, v] of list.entries()) {
    const n = v.name.trim();
    if (!n) return `Escribe el nombre de la opción ${i + 1}.`;
    if (n.length > 60) return `El nombre de la opción "${n.slice(0, 20)}…" es muy largo (máximo 60).`;
    if (seen.has(n.toLowerCase())) return `Hay dos opciones llamadas "${n}".`;
    seen.add(n.toLowerCase());
    if (v.price.trim() !== "" && !(Number(v.price) >= 0)) return `El precio de "${n}" no es válido.`;
    if (!v.unlimited && !(Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0)) return `El stock de "${n}" debe ser un número entero.`;
  }
  return null;
}

/** Filas listas para guardar en product_variants. */
export const toRow = (v: VariantForm, productId: string, position: number) => ({
  product_id: productId,
  name: v.name.trim(),
  color: /^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : null,
  images: v.images,
  stock: v.unlimited ? 0 : Number(v.stock),
  unlimited_stock: v.unlimited,
  price: v.price.trim() === "" ? null : Number(v.price),
  position,
  active: v.active,
});

type Props = {
  label: string;
  onLabel: (l: string) => void;
  variants: VariantForm[];
  onChange: (v: VariantForm[]) => void;
  token: string | null;
  savedImages: Set<string>; // fotos que ya estaban guardadas (esas se borran al guardar, no al instante)
  readOnly?: boolean;
};

export default function VariantsEditor({ label, onLabel, variants, onChange, token, savedImages }: Props) {
  const patch = (key: string, p: Partial<VariantForm>) => onChange(variants.map((v) => (v.key === key ? { ...v, ...p } : v)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= variants.length) return;
    const next = [...variants];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (v: VariantForm) => {
    if (!confirm(`¿Quitar la opción "${v.name || "sin nombre"}"? Se borrará al guardar el producto.`)) return;
    deleteImages(v.images.filter((u) => !savedImages.has(u)), token); // las fotos nuevas sin guardar se borran ya
    onChange(variants.filter((x) => x.key !== v.key));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/60">
          Opciones <span className="text-white/35">(colores, tallas… opcional)</span>
        </p>
        <button
          type="button"
          onClick={() => onChange([...variants, newVariantForm()])}
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs uppercase tracking-widest text-white/70 transition hover:border-gold-300 hover:text-gold-200"
        >
          <Plus className="h-3.5 w-3.5" /> Agregar
        </button>
      </div>

      {variants.length === 0 ? (
        <p className="text-xs text-white/40">
          Sin opciones: el producto usa su propio stock y sus fotos. Agrega una si la pieza viene en varios colores o tallas; cada opción tendrá sus fotos y su stock.
        </p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-xs text-white/50">Cómo se llama la opción</span>
            <input className="input" list="variant-labels" value={label} maxLength={20} onChange={(e) => onLabel(e.target.value)} placeholder="Color" />
            <datalist id="variant-labels">
              <option value="Color" />
              <option value="Talla" />
              <option value="Acabado" />
              <option value="Tamaño" />
            </datalist>
          </label>
          <p className="text-xs text-white/40">Con opciones, el stock del producto se ignora: manda el de cada opción.</p>

          <ul className="space-y-3">
            {variants.map((v, i) => (
              <li key={v.key} className={`space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 ${v.active ? "" : "opacity-60"}`}>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Color de muestra"
                    title="Color de muestra (opcional)"
                    value={/^#[0-9a-fA-F]{6}$/.test(v.color) ? v.color : "#cccccc"}
                    onChange={(e) => patch(v.key, { color: e.target.value })}
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5"
                  />
                  <input className="input" placeholder={`Nombre (ej. ${label === "Talla" ? "Talla 7" : "Oro rosa"})`} value={v.name} maxLength={60} onChange={(e) => patch(v.key, { name: e.target.value })} />
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="rounded-full p-2 text-white/50 hover:text-gold-300 disabled:opacity-25"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === variants.length - 1} aria-label="Bajar" className="rounded-full p-2 text-white/50 hover:text-gold-300 disabled:opacity-25"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(v)} aria-label="Quitar opción" className="rounded-full p-2 text-white/40 hover:text-rose-gold"><Trash2 className="h-4 w-4" /></button>
                </div>
                {v.color && (
                  <button type="button" onClick={() => patch(v.key, { color: "" })} className="text-xs text-white/40 hover:text-white/70">
                    Quitar color de muestra (se mostrará solo el nombre)
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <input className="input disabled:opacity-40" type="number" min={0} placeholder="Stock" value={v.unlimited ? "" : v.stock} disabled={v.unlimited} onChange={(e) => patch(v.key, { stock: e.target.value })} aria-label={`Stock de ${v.name || "la opción"}`} />
                  <input className="input" type="number" min={0} placeholder="Precio propio (opcional)" value={v.price} onChange={(e) => patch(v.key, { price: e.target.value })} aria-label={`Precio de ${v.name || "la opción"}`} />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-white/65">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={v.unlimited} onChange={(e) => patch(v.key, { unlimited: e.target.checked })} className="accent-gold-300" /> Stock ilimitado
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={v.active} onChange={(e) => patch(v.key, { active: e.target.checked })} className="accent-gold-300" /> Visible en la tienda
                  </label>
                </div>
                <ImageManager
                  images={v.images}
                  onChange={(images) => patch(v.key, { images })}
                  token={token}
                  onDiscard={(url) => {
                    if (!savedImages.has(url)) deleteImages([url], token);
                  }}
                />
                {v.images.length === 0 && <p className="text-xs text-white/35">Sin fotos propias: se mostrarán las del producto.</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}