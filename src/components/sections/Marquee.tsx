const items = [
  "Envío asegurado a todo el país",
  "Certificado de autenticidad",
  "Oro 18k colombiano",
  "Garantía de por vida",
  "Empaque de regalo de lujo",
  "Grabado personalizado",
];

export default function Marquee() {
  const row = [...items, ...items];
  return (
    <div className="relative2 overflow-hidden border-y border-gold-400/20 bg-ink-900 py-5">
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
