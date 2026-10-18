"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import Reveal from "@/components/ui/Reveal";
import { topicsOf, useFaqs } from "@/lib/site/faq";

export default function Faq() {
  const faqs = useFaqs();

  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const topics = useMemo(
    () => (faqs ? topicsOf(faqs) : []),
    [faqs]
  );

  const groupedFaqs = useMemo(
    () =>
      topics.map((topic) => ({
        name: topic,
        questions: (faqs ?? []).filter((faq) => faq.topic === topic),
      })),
    [faqs, topics]
  );

  if (!faqs?.length) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <section
      id="preguntas"
      className="bg-ink-900 px-5 py-16 sm:px-6 sm:py-20"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd),
        }}
      />

      <div className="mx-auto max-w-3xl">
        <Reveal>
          <div className="mb-8 text-center sm:mb-10">
            <p className="eyebrow mb-2">Dudas</p>

            <h2 className="section-title">
              Preguntas{" "}
              <span className="gold-text italic">
                frecuentes
              </span>
            </h2>
          </div>
        </Reveal>

        <div className="border-t border-white/10">
          {groupedFaqs.map((group) => {
            const isTopicOpen = openTopic === group.name;

            return (
              <div
                key={group.name}
                className="border-b border-white/10"
              >
                {/* Acordeón de categoría */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenTopic(
                      isTopicOpen ? null : group.name
                    );
                    setOpenQuestion(null);
                  }}
                  aria-expanded={isTopicOpen}
                  className="group flex w-full items-center gap-4 py-4 text-left sm:py-5"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs transition-colors ${
                      isTopicOpen
                        ? "border-gold-300/50 bg-gold-300/10 text-gold-200"
                        : "border-white/10 text-white/45 group-hover:border-gold-300/40 group-hover:text-gold-200"
                    }`}
                  >
                    {String(
                      groupedFaqs.indexOf(group) + 1
                    ).padStart(2, "0")}
                  </span>

                  <span className="flex-1">
                    <span
                      className={`block font-serif text-lg transition-colors sm:text-xl ${
                        isTopicOpen
                          ? "text-gold-200"
                          : "text-white/85 group-hover:text-gold-200"
                      }`}
                    >
                      {group.name}
                    </span>

                    <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {group.questions.length}{" "}
                      {group.questions.length === 1
                        ? "pregunta"
                        : "preguntas"}
                    </span>
                  </span>

                  <motion.span
                    animate={{
                      rotate: isTopicOpen ? 45 : 0,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isTopicOpen
                        ? "border-gold-300/50 text-gold-300"
                        : "border-white/10 text-white/45 group-hover:border-gold-300/40"
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </motion.span>
                </button>

                {/* Contenido de la categoría */}
                <AnimatePresence initial={false}>
                  {isTopicOpen && (
                    <motion.div
                      key="topic-content"
                      initial={{
                        height: 0,
                        opacity: 0,
                      }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                      }}
                      transition={{
                        duration: 0.25,
                        ease: "easeInOut",
                      }}
                      className="overflow-hidden"
                    >
                      <div className="mb-3 ml-4 border-l border-gold-300/20 pl-4 sm:ml-5 sm:pl-5">
                        {group.questions.map((f) => {
                          const questionKey =
                            `${group.name}:${f.id}`;

                          const isQuestionOpen =
                            openQuestion === questionKey;

                          return (
                            <div
                              key={f.id}
                              className="border-b border-white/[0.06] last:border-b-0"
                            >
                              {/* Pregunta individual */}
                              <h3>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenQuestion(
                                      isQuestionOpen
                                        ? null
                                        : questionKey
                                    )
                                  }
                                  aria-expanded={isQuestionOpen}
                                  aria-controls={`faq-answer-${f.id}`}
                                  className="group flex w-full items-center justify-between gap-3 py-3 text-left"
                                >
                                  <span
                                    className={`text-sm leading-relaxed transition-colors ${
                                      isQuestionOpen
                                        ? "text-gold-200"
                                        : "text-white/70 group-hover:text-white"
                                    }`}
                                  >
                                    {f.question}
                                  </span>

                                  <motion.span
                                    animate={{
                                      rotate: isQuestionOpen
                                        ? 45
                                        : 0,
                                    }}
                                    transition={{
                                      duration: 0.2,
                                    }}
                                    className="shrink-0 text-white/35 transition-colors group-hover:text-gold-300"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </motion.span>
                                </button>
                              </h3>

                              {/* Respuesta */}
                              <AnimatePresence initial={false}>
                                {isQuestionOpen && (
                                  <motion.div
                                    id={`faq-answer-${f.id}`}
                                    initial={{
                                      height: 0,
                                      opacity: 0,
                                    }}
                                    animate={{
                                      height: "auto",
                                      opacity: 1,
                                    }}
                                    exit={{
                                      height: 0,
                                      opacity: 0,
                                    }}
                                    transition={{
                                      duration: 0.22,
                                      ease: "easeInOut",
                                    }}
                                    className="overflow-hidden"
                                  >
                                    <p className="whitespace-pre-line pb-4 pr-2 text-sm leading-relaxed text-white/50">
                                      {f.answer}
                                    </p>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
