// "use client";

// import { useState } from "react";
// import { motion } from "framer-motion";
// import { Check, Clock, Instagram, Mail, MapPin, Phone, Send } from "lucide-react";
// import Reveal from "./Reveal";

// export default function Contact() {
//   const [sent, setSent] = useState(false);
//   const wa = process.env.NEXT_PUBLIC_WHATSAPP ?? "573001234567";

//   return (
//     <section id="contacto" className="relative overflow-hidden bg-ink-900 py-28">
//       <div className="pointer-events-none absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-gold-500/10 blur-3xl" />
//       <div className="relative mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-2">
//         <div>
//           <Reveal>
//             <p className="eyebrow mb-4">Contacto</p>
//             <h2 className="section-title">
//               Diseñemos tu <span className="gold-text italic">pieza ideal</span>
//             </h2>
//             <p className="mt-6 max-w-md text-white/60">
//               ¿Una pieza a medida, un regalo o una asesoría personalizada? Escríbenos y un experto te responderá hoy.
//             </p>
//           </Reveal>
//           <ul className="mt-10 space-y-5 text-sm text-white/70">
//             {[
//               { i: MapPin, t: "Cali, Valle del Cauca · Colombia" },
//               { i: Phone, t: "+57 300 123 4567" },
//               { i: Mail, t: "hola@crjoyas.co" },
//               { i: Clock, t: "Lun – Sáb · 10:00 a 19:00" },
//             ].map(({ i: Icon, t }, k) => (
//               <Reveal key={t} delay={k * 0.08}>
//                 <li className="flex items-center gap-4">
//                   <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-400/30">
//                     <Icon className="h-4 w-4 text-gold-300" />
//                   </span>
//                   {t}
//                 </li>
//               </Reveal>
//             ))}
//           </ul>
//           <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="btn-ghost mt-10">
//             Escribir por WhatsApp
//           </a>
//         </div>

//         <Reveal delay={0.15}>
//           <form
//             onSubmit={(e) => {
//               e.preventDefault();
//               setSent(true);
//             }}
//             className="space-y-4 rounded-3xl border border-white/10 bg-ink-950/60 p-8 backdrop-blur"
//           >
//             <input required className="input" placeholder="Tu nombre" />
//             <input required type="email" className="input" placeholder="Tu correo" />
//             <textarea required rows={5} className="input resize-none" placeholder="Cuéntanos qué joya imaginas..." />
//             <button type="submit" className="btn-gold w-full">
//               {sent ? (
//                 <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
//                   <Check className="h-4 w-4" /> Mensaje enviado
//                 </motion.span>
//               ) : (
//                 <span className="flex items-center gap-2">
//                   <Send className="h-4 w-4" /> Enviar mensaje
//                 </span>
//               )}
//             </button>
//           </form>
//         </Reveal>
//       </div>
//     </section>
//   );
// }

// export function Footer() {
//   return (
//     <footer className="border-t border-gold-400/10 bg-ink-950 py-12">
//       <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-white/40 md:flex-row">
//         <span className="gold-text font-serif text-xl tracking-[0.3em]">CR JOYAS</span>
//         <p>© {new Date().getFullYear()} CR Joyas. Todos los derechos reservados.</p>
//         <a href="#inicio" aria-label="Instagram" className="rounded-full border border-white/10 p-3 transition hover:border-gold-300 hover:text-gold-300">
//           <Instagram className="h-4 w-4" />
//         </a>

//       </div>
//     </footer>
//   );
// }

"use client";

import { MapPin, Phone, Mail, Clock, Instagram, Facebook } from "lucide-react";
// import { SiTiktok } from "react-icons/si";
import Reveal from "./Reveal";

export default function Contact() {
  const wa = process.env.NEXTPUBLICWHATSAPP ?? "573001234567";

  const contactInfo = [
    { i: MapPin, t: "Cali, Valle del Cauca · Colombia" },
    { i: Phone, t: "+57 300 123 4567" },
    { i: Mail, t: "hola@crjoyas.co" },
    { i: Clock, t: "Lun – Sáb · 10:00 a 19:00" },
  ];

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
            href={`https://wa.me/${wa}`}
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
              
              {contactInfo.map(({ i: Icon, t }, k) => (
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
  return (
    <footer className="border-t border-gold-400/10 bg-ink-950 py-12">
      
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-white/40 md:flex-row">
        
        <span className="gold-text font-serif text-xl tracking-[0.3em]">
          
          CR JOYAS
        </span>
        <p className="text-center">
          
          © {new Date().getFullYear()} CR Joyas. Todos los derechos
          reservados.
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
