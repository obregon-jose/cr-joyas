"use client";

import { MapPin, Phone, Mail, Clock } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { useSiteSettings, waLink } from "@/lib/site/site-settings";

export default function Contact() {
  const site = useSiteSettings();

  const contactItems = [
    { i: MapPin, t: site.address },
    { i: Phone, t: site.phone },
    { i: Mail, t: site.email },
    { i: Clock, t: site.hours },
  ].filter((x) => x.t.trim());

  return (
    <section
      id="contacto"
      className="relative overflow-hidden bg-ink-900 py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-gold-500/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:gap-16">
        {/* MENSAJE Y BOTÓN */}
        <Reveal>
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="eyebrow mb-4">Contacto</p>

            <h2 className="section-title">
              Diseñemos tu{" "}
              <span className="gold-text italic">
                pieza ideal
              </span>
            </h2>

            <p className="mt-6 max-w-md text-white/60">
              Cuéntanos qué tienes en mente y encontremos juntos la pieza perfecta para ti o para alguien especial.
            </p>

            <a
              href={waLink(site.whatsapp, "Hola, quisiera más información sobre sus joyas.")}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost mt-8 inline-flex"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </Reveal>

        {/* INFORMACIÓN DE CONTACTO */}
        <Reveal delay={0.15}>
          <ul className="mx-auto max-w-md space-y-5 text-sm text-white/70 lg:mx-0">
            {contactItems.map(({ i: Icon, t }, k) => (
              <Reveal key={t} delay={k * 0.08}>
                <li className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-400/30">
                    <Icon className="h-4 w-4 text-gold-300" />
                  </span>

                  <span className="min-w-0 break-words">
                    {t}
                  </span>
                </li>
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
