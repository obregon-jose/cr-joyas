"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Star, Trash2, Upload } from "lucide-react";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  token: string | null;
  max?: number;
};

/** Sube varias imágenes (ImgBB vía /api/upload), reordena y elimina. La primera es la portada. */
export default function ImageManager({ images, onChange, token, max = 8 }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList) => {
    setError("");
    setUploading(true);
    const next = [...images];
    for (const file of Array.from(files)) {
      if (next.length >= max) {
        setError(`Máximo ${max} imágenes por producto.`);
        break;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd, headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "Error al subir la imagen");
          break;
        }
        next.push(json.url);
        onChange([...next]);
      } catch {
        setError("No se pudo subir la imagen");
        break;
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (i: number) => onChange(images.filter((_, idx) => idx !== i));

  const btn = "rounded-full bg-ink-950/80 p-1.5 text-white/80 backdrop-blur transition hover:bg-ink-950 hover:text-gold-300 disabled:opacity-30";

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gold-400/40 p-4 text-sm text-white/60 transition hover:border-gold-300">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-gold-300" />}
        {images.length === 0
          ? "Subir imágenes (puedes elegir varias)"
          : `${images.length}/${max} imágenes · clic para agregar más`}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          disabled={uploading || images.length >= max}
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={url + i} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Imagen ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-gold-400 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-ink-950">
                  <Star className="h-3 w-3" /> Portada
                </span>
              )}
              <button type="button" onClick={() => remove(i)} aria-label="Eliminar imagen" className={`${btn} absolute right-1.5 top-1.5`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Mover antes" className={btn}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
                {i > 0 && (
                  <button type="button" onClick={() => move(i, 0)} className={`${btn} px-2 text-[10px] uppercase tracking-wider`}>
                    Portada
                  </button>
                )}
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1} aria-label="Mover después" className={btn}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-rose-300">{error}</p>}
    </div>
  );
}