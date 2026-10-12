"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gem } from "lucide-react";

// Cortina de entrada con el logo, se abre en dos mitades.
export default function Loading() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div className="fixed inset-0 z-[100] flex items-center justify-center" exit={{ pointerEvents: "none" }}>
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2 bg-ink-950"
            exit={{ x: "-100%" }}
            transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2 bg-ink-950"
            exit={{ x: "100%" }}
            transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
          />
          <motion.div
            className="relative z-10 flex flex-col items-center gap-5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            >
              <Gem className="h-14 w-14 text-gold-300" strokeWidth={1} />
            </motion.div>
            <div className="overflow-hidden">
              <motion.p
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="gold-text font-serif text-4xl tracking-[0.3em]"
              >
                CR JOYAS
              </motion.p>
            </div>
            <motion.div
              className="h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent"
              initial={{ width: 0 }}
              animate={{ width: 220 }}
              transition={{ delay: 0.6, duration: 1.2 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
