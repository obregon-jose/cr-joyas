"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, ImagePlus, KeyRound, Loader2, Trash2, X } from "lucide-react";
import { toast } from "@/lib/ui/toast";
import SafeImage from "@/components/ui/SafeImage";
import { StarsInput } from "@/components/ui/StarRating";
import { Reviewable, claimOrder, loadProfile, saveProfile, submitReview, uploadReviewImage } from "@/lib/reviews/reviews";

type Props = {
  open: boolean;
  mode: "write" | "claim";
  options: Reviewable[]; // piezas compradas por este dispositivo que aún no tienen reseña
  onClose: () => void;
  onDone: () => void; // recargar piezas/reseñas
};

const MAX_PHOTOS = 5;
const MIN_CHARS = 10;
const MAX_CHARS = 1000;

const WORDS: Record<number, string> = { 1: "Muy mala", 2: "Regular", 3: "Buena", 4: "Muy buena", 5: "Excelente" };
const wordFor = (v: number) => (v ? WORDS[Math.max(1, Math.ceil(v))] : "Toca las estrellas (puedes elegir medias estrellas)");

export default function ReviewModal({ open, mode, options, onClose, onDone }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[75] flex items-end justify-center sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-gold-400/20 bg-ink-900 sm:rounded-3xl"
          >
            <button onClick={onClose} aria-label="Cerrar" className="absolute right-4 top-4 z-10 rounded-full bg-ink-950/70 p-2.5 transition hover:rotate-90">
              <X className="h-5 w-5" />
            </button>
            {mode === "write" ? <WriteForm options={options} onClose={onClose} onDone={onDone} /> : <ClaimForm onClose={onClose} onDone={onDone} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Escribir reseña ---------- */

function WriteForm({ options, onClose, onDone }: { options: Reviewable[]; onClose: () => void; onDone: () => void }) {
  const [productId, setProductId] = useState(options[0]?.product_id ?? "");
  const selected = useMemo(() => options.find((o) => o.product_id === productId) ?? options[0], [options, productId]);

  // Nombre: primero lo que el cliente usó la última vez; si no, el de su pedido.
  const [name, setName] = useState("");
  const touched = useRef(false);
  useEffect(() => {
    if (touched.current) return;
    const saved = loadProfile();
    setName(saved?.name || selected?.customer_name || "");
  }, [selected]);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(0);
  const [photoErrors, setPhotoErrors] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addPhotos = async (list: FileList) => {
    const files = Array.from(list);
    if (fileRef.current) fileRef.current.value = "";
    const room = Math.max(0, MAX_PHOTOS - photos.length);
    const errors: string[] = [];
    if (files.length > room) errors.push(`Máximo ${MAX_PHOTOS} fotos.`);
    setPhotoErrors([]);
    const next = [...photos];
    for (const f of files.slice(0, room)) {
      setUploading((n) => n + 1);
      try {
        next.push(await uploadReviewImage(f));
        setPhotos([...next]);
      } catch (e) {
        errors.push(`${f.name}: ${e instanceof Error ? e.message : "no se pudo subir"}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    setPhotoErrors(errors);
  };

  const valid = rating >= 0.5 && comment.trim().length >= MIN_CHARS && name.trim().length >= 2;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !selected || sending || uploading > 0) return;
    setSending(true);
    try {
      await submitReview({ productId: selected.product_id, rating, name: name.trim(), comment: comment.trim(), images: photos });
      saveProfile({ name: name.trim() });
      setDone(true);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos enviar tu reseña. Inténtalo de nuevo.");
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 px-8 py-16 text-center">
        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", damping: 12 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-200">
          <Check className="h-10 w-10 text-ink-950" strokeWidth={3} />
        </motion.div>
        <h3 className="font-serif text-3xl">¡Gracias por tu reseña!</h3>
        <p className="max-w-sm text-white/60">La revisaremos y la publicaremos en la página muy pronto.</p>
        <button onClick={onClose} className="btn-ghost mt-2">Cerrar</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 p-6 sm:p-8">
      <div className="pr-10">
        <p className="eyebrow mb-2">Tu opinión</p>
        <h3 className="font-serif text-3xl">Cuéntanos tu experiencia</h3>
      </div>

      {/* Pieza */}
      {options.length > 1 ? (
        <div>
          <p className="mb-2 text-sm text-white/60">¿Qué pieza quieres reseñar?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {options.map((o) => (
              <button
                key={o.product_id}
                type="button"
                onClick={() => setProductId(o.product_id)}
                className={`overflow-hidden rounded-2xl border text-left transition ${o.product_id === selected?.product_id ? "border-gold-300 bg-gold-400/10" : "border-white/10 hover:border-white/30"}`}
              >
                <SafeImage src={o.image ?? ""} alt={o.product_name} className="aspect-square w-full object-cover" />
                <span className="line-clamp-2 block p-2.5 text-xs text-white/80">{o.product_name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        selected && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
            <SafeImage src={selected.image ?? ""} alt={selected.product_name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
            <p className="font-serif text-xl">{selected.product_name}</p>
          </div>
        )
      )}

      {/* Estrellas */}
      <div className="text-center">
        <StarsInput value={rating} onChange={setRating} size={42} />
        <p className={`mt-2 text-sm ${rating ? "text-gold-300" : "text-white/40"}`}>{wordFor(rating)}</p>
      </div>

      {/* Comentario */}
      <div>
        <textarea
          className="input resize-none"
          rows={5}
          maxLength={MAX_CHARS}
          placeholder="¿Qué te pareció la pieza, el empaque, la atención o el envío?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <p className={`mt-1 text-right text-xs ${comment.trim().length >= MIN_CHARS ? "text-white/30" : "text-white/50"}`}>
          {comment.trim().length < MIN_CHARS ? `Escribe al menos ${MIN_CHARS} caracteres` : `${comment.length}/${MAX_CHARS}`}
        </p>
      </div>

      {/* Fotos (opcional) */}
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm text-white/60">
          <Camera className="h-4 w-4 text-gold-300" /> Agrega fotos <span className="text-white/35">(opcional, hasta {MAX_PHOTOS})</span>
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10">
              <SafeImage src={url} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
              <button type="button" onClick={() => setPhotos((p) => p.filter((u) => u !== url))} aria-label="Quitar foto" className="absolute right-1.5 top-1.5 rounded-full bg-ink-950/80 p-1.5 transition hover:text-rose-gold">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`u${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-gold-400/40">
              <Loader2 className="h-5 w-5 animate-spin text-gold-300" />
            </div>
          ))}
          {photos.length + uploading < MAX_PHOTOS && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gold-400/40 text-xs text-white/50 transition hover:border-gold-300 hover:text-gold-200">
              <ImagePlus className="h-5 w-5" /> Agregar
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files?.length && addPhotos(e.target.files)} />
            </label>
          )}
        </div>
        {photoErrors.map((m) => (
          <p key={m} className="mt-2 text-sm text-rose-gold">{m}</p>
        ))}
      </div>

      {/* Nombre */}
      <label className="block space-y-1.5">
        <span className="text-sm text-white/60">Tu nombre</span>
        <input
          className="input"
          name="name"
          autoComplete="name"
          maxLength={60}
          value={name}
          onChange={(e) => { touched.current = true; setName(e.target.value); }}
          required
        />
      </label>
      <p className="-mt-3 text-xs text-white/35">Así aparecerá en tu reseña. Puedes cambiarlo (por ejemplo, usar solo tu nombre y la inicial del apellido).</p>

      <button disabled={!valid || sending || uploading > 0} className="btn-gold w-full disabled:cursor-not-allowed disabled:opacity-40">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar reseña"}
      </button>
    </form>
  );
}

/* ---------- Vincular un pedido ---------- */

function ClaimForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [order, setOrder] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(order.replace(/\D/g, ""));
    if (!n) return toast.error("Escribe el número de tu pedido");
    setSending(true);
    try {
      await claimOrder(n, phone);
      setOk(true);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No pudimos vincular el pedido");
    } finally {
      setSending(false);
    }
  };

  if (ok) {
    return (
      <div className="flex flex-col items-center gap-5 px-8 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-200">
          <Check className="h-10 w-10 text-ink-950" strokeWidth={3} />
        </div>
        <h3 className="font-serif text-3xl">Pedido vinculado</h3>
        <p className="max-w-sm text-white/60">Si el pago ya está confirmado, ahora verás el botón para escribir tu reseña.</p>
        <button onClick={onClose} className="btn-ghost mt-2">Entendido</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 p-6 sm:p-8">
      <div className="pr-10">
        <p className="eyebrow mb-2 flex items-center gap-2"><KeyRound className="h-4 w-4" /> Vincular compra</p>
        <h3 className="font-serif text-3xl">Ya compré y no veo mi reseña</h3>
        <p className="mt-3 text-sm text-white/55">Si compraste desde otro celular o borraste los datos del navegador, vincula tu pedido con el número que te dimos y el teléfono que usaste al comprar.</p>
      </div>
      <input className="input" inputMode="numeric" placeholder="Número de pedido (ej. 1042)" value={order} onChange={(e) => setOrder(e.target.value)} required />
      <input className="input" type="tel" autoComplete="tel" placeholder="Teléfono con el que compraste" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      <p className="text-xs text-white/35">Las reseñas se habilitan cuando confirmamos el pago de tu pedido.</p>
      <button disabled={sending} className="btn-gold w-full disabled:opacity-50">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vincular pedido"}
      </button>
    </form>
  );
}