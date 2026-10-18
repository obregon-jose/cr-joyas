"use client";

import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { WhatsAppIcon } from "@/app/icons"
import { useSiteSettings, waLink } from "@/lib/site/site-settings";

export default function WhatsAppFab() {
  
  const site = useSiteSettings();

  return (
    <motion.a
      href={`https://wa.me/${waLink(site.whatsapp)}`}
      target="_blank"
      rel="noreferrer"
      aria-label="WhatsApp"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 4.2, type: "spring" }}
      whileHover={{ scale: 1.1 }}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-gold-200 text-ink-950 shadow-[0_0_30px_rgba(217,174,58,0.45)]"
    >
      <span className="absolute inset-0 animate-ping- rounded-full bg-gold-300/40" />
      <WhatsAppIcon className="relative w-8 h-8"/>
    </motion.a>
  );
}
