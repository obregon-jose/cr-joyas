"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Plus } from "lucide-react";
import Reveal from "./Reveal";
import { topicsOf, useFaqs } from "@/lib/faq";
import { useSiteSettings, waLink } from "@/lib/site-settings";

export default function Faq() {
  const faqs = useFaqs();
  const site = useSiteSettings();
  const [topic, setTopic] = useState("Todas");
  const [open, setOpen] = useState<string | null>(null);

  const topics = useMemo(() => (faqs ? topicsOf(faqs) : []), [faqs]);
  const shown = useMemo(() => (faqs ?? []).filter((f) => topic === "Todas" || f.topic === topic), [faqs, topic]);

  if (!faqs || faqs.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const pill = (on: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition ${
      on ? "border-gold-300 bg-gold-300 text-ink-950" : "border-white/10 text-white/60 hover:border-gold-400/40 hover:text-gold-200"
    }`;

  return (
    <section id="preguntas" className="bg-ink-900 mx-auto max-w-3xl px-6 py-24 sm:py-28">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Reveal>
        <div className="text-center">
          <p className="eyebrow mb-4">Dudas</p>
          <h2 className="section-title mb-10">
            Preguntas <span className="gold-text italic">frecuentes</span>
          </h2>
        </div>
      </Reveal>

      {topics.length > 1 && (
        <div className="-mx-6 mb-8 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["Todas", ...topics].map((t) => (
            <button key={t} onClick={() => { setTopic(t); setOpen(null); }} className={pill(topic === t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-white/10">
        {shown.map((f) => {
          const isOpen = open === f.id;
          return (
            <div key={f.id} className="border-b border-white/10">
              <h3>
                <button
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  aria-expanded={isOpen}
                  className="group flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className={`font-serif text-xl leading-snug transition-colors sm:text-2xl ${isOpen ? "text-gold-200" : "text-white group-hover:text-gold-200"}`}>
                    {f.question}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25 }}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${isOpen ? "border-gold-300 text-gold-300" : "border-white/15 text-white/50 group-hover:border-gold-400/50"}`}
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="whitespace-pre-line pb-6 pr-12 leading-relaxed text-white/65">{f.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}