"use client";

import { Instagram, Facebook } from "lucide-react";
import { SiTiktok, SiInstagram, SiFacebook } from "react-icons/si";
import { useSiteSettings } from "@/lib/site/site-settings";

export default function Footer() {
  const site = useSiteSettings();

  return (
    <footer className="border-t border-gold-400/10 bg-ink-950 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-6 text-sm text-white/40 lg:flex-row lg:justify-between">
        {/* Nombre y redes agrupados en móvil */}
        <div className="flex flex-col items-center gap-5 lg:contents">
          <span className="gold-text font-serif text-xl tracking-[0.3em]">
            {site.brand_name.toUpperCase()}
          </span>

          {/* Redes: debajo del nombre en móvil */}
          <div className="flex items-center gap-3 lg:order-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300"
            >
              <SiInstagram className="h-4 w-4" />
            </a>

            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300"
            >
              <SiFacebook className="h-4 w-4" />
            </a>

            <a
              href="https://www.tiktok.com/"
              target="_blank"
              rel="noreferrer"
              aria-label="TikTok"
              className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300"
            >
              <SiTiktok className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Derechos y desarrollador */}
        <div className="flex flex-col items-center gap-2 text-center lg:order-2">
          <p>
            © {new Date().getFullYear()} {site.footer_text}
          </p>

          <p>
            Desarrollado por{" "}
            <a
              href="#"
              className="text-gold-300 transition hover:text-gold-200"
            >
              José Obregón
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
