"use client";

import { useSiteSettings } from "@/lib/site/site-settings";

export default function Marquee() {
  const { marquee_items } = useSiteSettings();
  if (marquee_items.length === 0) return null;

  // Con pocos mensajes se repiten hasta llenar la pantalla; luego se duplica todo para que el bucle sea continuo.
  const base = Array.from({ length: Math.ceil(8 / marquee_items.length) }, () => marquee_items).flat();
  const row = [...base, ...base];

  return (
    <div className="relative overflow-hidden border-y border-gold-400/20 bg-ink-900 py-5">
      <div className="flex w-max animate-marquee gap-12 whitespace-nowrap">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-12 font-serif text-xl italic text-gold-200/80">
            {t}
            <span className="text-gold-500">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}