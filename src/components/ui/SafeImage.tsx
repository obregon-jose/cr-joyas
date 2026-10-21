"use client";

import { useState } from "react";
import { Gem } from "lucide-react";

type Props = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean; // foto principal: se descarga de inmediato en vez de esperar al scroll
};

// Imagen con fallback elegante si la URL (ImgBB / Unsplash) falla.
export default function SafeImage({ src, alt, className = "", priority = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-ink-700 to-ink-900 ${className}`}
        aria-label={alt}
      >
        <Gem className="h-10 w-10 text-gold-500/60" />
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}