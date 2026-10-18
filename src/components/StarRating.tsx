"use client";

import { useState } from "react";
import { Star } from "lucide-react";

/** Una estrella con relleno parcial (0, 0.5 o 1). */
function StarGlyph({ fill, size }: { fill: number; size: number }) {
  const icon = { width: size, height: size, maxWidth: "none" } as const;
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <Star style={icon} className="text-white/20" strokeWidth={1.4} />
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
        <Star style={icon} className="fill-gold-300 text-gold-300" strokeWidth={1.4} />
      </span>
    </span>
  );
}

const fillFor = (value: number, i: number) => Math.max(0, Math.min(1, (value - i) * 1)); // 0..1 por estrella

/** Texto accesible: 3.5 → "3 y media de 5 estrellas". */
export function ratingLabel(value: number) {
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  const text = half ? (whole === 0 ? "media" : `${whole} y media`) : `${whole}`;
  return `${text} de 5 estrellas`;
}

/** Estrellas de solo lectura (admite medias estrellas). Sin números. */
export function StarsDisplay({ value, size = 16, className = "" }: { value: number; size?: number; className?: string }) {
  const v = Math.round(Math.max(0, Math.min(5, value)) * 2) / 2;
  return (
    <span role="img" aria-label={ratingLabel(v)} className={`inline-flex items-center gap-0.5 ${className}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <StarGlyph key={i} fill={fillFor(v, i)} size={size} />
      ))}
    </span>
  );
}

/** Selector de calificación de 0.5 a 5 en pasos de media estrella. Toca la mitad izquierda o derecha de cada estrella. */
export function StarsInput({ value, onChange, size = 36 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Calificación"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuestep={0.5}
      aria-valuenow={value || undefined}
      aria-valuetext={value ? ratingLabel(value) : "Sin calificar"}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(5, (value || 0) + 0.5));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(0.5, (value || 1) - 0.5));
        }
      }}
      onMouseLeave={() => setHover(null)}
      className="inline-flex items-center gap-1 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-gold-300/60"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
          <StarGlyph fill={fillFor(shown, i)} size={size} />
          {/* dos mitades táctiles por estrella */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
            onMouseEnter={() => setHover(i + 0.5)}
            onClick={() => onChange(i + 0.5)}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
            onMouseEnter={() => setHover(i + 1)}
            onClick={() => onChange(i + 1)}
          />
        </span>
      ))}
    </div>
  );
}