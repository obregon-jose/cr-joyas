"use client";

import { MapPin, Phone, Mail, Clock, Instagram, Facebook } from "lucide-react";
// import { SiTiktok } from "react-icons/si";
import Reveal from "./Reveal";
import { useSiteSettings, waLink } from "@/lib/site-settings";

export default function Contact() {
  const site = useSiteSettings();

  return (
    <section
      id="contacto"
      className="relative overflow-hidden bg-ink-900 py-28"
    >
      
      <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-gold-500/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2">
        
        {/* IZQUIERDA: MENSAJE Y BOTÓN */}
        <Reveal>
          
          <p className="eyebrow mb-4">Contacto</p>
          <h2 className="section-title">
            
            Diseñemos tu
            <span className="gold-text italic">pieza ideal</span>
          </h2>
          <p className="mt-6 max-w-md text-white/60">
            
            ¿Una pieza a medida, un regalo o una asesoría personalizada?
            Escríbenos y un experto te responderá hoy.
          </p>
          <a
            href={`https://wa.me/${waLink(site.whatsapp)}`}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost mt-10 inline-flex"
          >
            
            Escribir por WhatsApp
          </a>
        </Reveal>
        {/* DERECHA: INFORMACIÓN DE CONTACTO */}
        <Reveal delay={0.15}>
          
            <ul className="space-y-6 text-sm text-white/70 ">
              
              {[
  { i: MapPin, t: site.address },
  { i: Phone, t: site.phone },
  { i: Mail, t: site.email },
  { i: Clock, t: site.hours },
].filter((x) => x.t.trim()).map(({ i: Icon, t }, k) => (
                <Reveal key={t} delay={k * 0.08}>
                  
                  <li className="flex items-center gap-1">
                    
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold-400/30">
                      
                      <Icon className="h-4 w-4 text-gold-300" />
                    </span>
                    <span>{t}</span>
                  </li>
                </Reveal>
              ))}
            </ul>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const site = useSiteSettings();
  return (
    <footer className="border-t border-gold-400/10 bg-ink-950 py-12">
      
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-white/40 md:flex-row">
        
        <span className="gold-text font-serif text-xl tracking-[0.3em]">
          
          {site.brand_name.toUpperCase()}
        </span>
        <p className="text-center">
          
          © {new Date().getFullYear()} {site.footer_text}
        </p>
        <div className="flex items-center gap-3">
          
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram"
            className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300"
          >
            
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://www.facebook.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook"
            className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300"
          >
            
            <Facebook className="h-4 w-4" />
          </a>
          <a
            href="https://www.tiktok.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="TikTok"
            className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300"
          >
            
            <Facebook className="h-4 w-4" />
          </a>
        </div>
      </div>
    </footer>
  );
}
