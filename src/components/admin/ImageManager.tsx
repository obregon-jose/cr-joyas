"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Star, Trash2, Upload } from "lucide-react";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  token: string | null;
  max?: number;
  /** Se llama cuando el admin quita una imagen de la lista (para borrarla de ImgBB si ya no se usa). */
  onDiscard?: (url: string) => void;
};

const MAX_SIDE = 1800; // lado máximo en píxeles
const QUALITY = 0.88;

/** Reduce fotos pesadas (celular/cámara) antes de subirlas: menos peso, subidas más rápidas y sin errores de tamaño. */
async function shrink(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || /gif|svg/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale);
    const h = Math.round(bmp.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // los PNG con transparencia pasan a JPEG sobre fondo blanco
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", QUALITY));
    if (!blob || blob.size >= file.size) return file; // si no mejora, se sube el original
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sube un archivo con hasta 3 intentos si falla la red o el servidor responde 5xx/429. */
async function uploadOne(file: File, token: string | null): Promise<string> {
  let lastError = "Error desconocido";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await wait(900 * attempt);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, headers: { Authorization: `Bearer ${token}` } });
      const text = await res.text();
      let json: { url?: string; error?: string } = {};
      try {
        json = JSON.parse(text);
      } catch {}
      if (res.ok && json.url) return json.url;
      lastError =
        json.error ??
        (res.status === 413 ? "La imagen es demasiado grande para el servidor" : `El servidor respondió con error ${res.status}`);
      if (res.status < 500 && res.status !== 429) break; // errores del usuario: no tiene sentido reintentar
    } catch {
      lastError = "Sin conexión con el servidor";
    }
  }
  throw new Error(lastError);
}

/** Sube varias imágenes (ImgBB vía /api/upload), reordena y elimina. La primera es la portada. */
export default function ImageManager({ images, onChange, token, max = 8, onDiscard }: Props) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploading = progress !== null;

  const upload = async (list: FileList) => {
    const all = Array.from(list); // se copia antes de limpiar el input
    if (inputRef.current) inputRef.current.value = "";
    const room = Math.max(0, max - images.length);
    const files = all.slice(0, room);
    const problems: string[] = [];
    if (all.length > room) problems.push(`Máximo ${max} imágenes: se omitieron ${all.length - room}.`);

    setErrors([]);
    setProgress({ done: 0, total: files.length });
    const next = [...images];
    for (let i = 0; i < files.length; i++) {
      const original = files[i];
      try {
        const url = await uploadOne(await shrink(original), token);
        next.push(url);
        onChange([...next]);
      } catch (e) {
        problems.push(`${original.name}: ${e instanceof Error ? e.message : "no se pudo subir"}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    setErrors(problems);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const remove = (i: number) => {
    onDiscard?.(images[i]);
    onChange(images.filter((_, idx) => idx !== i));
  };

  const btn = "rounded-full bg-ink-950/80 p-1.5 text-white/80 backdrop-blur transition hover:bg-ink-950 hover:text-gold-300 disabled:opacity-30";

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gold-400/40 p-4 text-sm text-white/60 transition hover:border-gold-300">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-gold-300" />}
        {uploading
          ? `Subiendo ${Math.min(progress!.done + 1, progress!.total)} de ${progress!.total}…`
          : images.length === 0
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
      {errors.length > 0 && (
        <ul className="space-y-1 text-sm text-rose-300">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}