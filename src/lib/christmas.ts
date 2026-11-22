// Temporada navideña: cuándo se activa, cuenta regresiva y mensaje de saludo.
// Todo es automático por fechas; no necesita base de datos.
//
// Variable opcional en .env (se lee al compilar):
//   NEXT_PUBLIC_CHRISTMAS=auto  → (por defecto) se activa solo del 15 de noviembre al 6 de enero
//   NEXT_PUBLIC_CHRISTMAS=on    → siempre activa (útil para probar)
//   NEXT_PUBLIC_CHRISTMAS=off   → apagada

export type ChristmasMode = "auto" | "on" | "off";

export const CHRISTMAS_MODE: ChristmasMode =
  process.env.NEXT_PUBLIC_CHRISTMAS === "on" || process.env.NEXT_PUBLIC_CHRISTMAS === "off"
    ? process.env.NEXT_PUBLIC_CHRISTMAS
    : "auto";

const START = { month: 10, day: 15 }; // 15 de noviembre (los meses van de 0 a 11)
const END = { month: 0, day: 6 }; // 6 de enero

export function isChristmasSeason(now: Date = new Date(), mode: ChristmasMode = CHRISTMAS_MODE): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  const m = now.getMonth();
  const d = now.getDate();
  const afterStart = m > START.month || (m === START.month && d >= START.day);
  const beforeEnd = m < END.month || (m === END.month && d <= END.day);
  return afterStart || beforeEnd;
}

const DAY = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Días que faltan para el 25 de diciembre (0 = hoy es Navidad; negativo = ya pasó). */
export function daysToChristmas(now: Date = new Date()): number {
  const today = startOfDay(now);
  const xmas = new Date(today.getFullYear(), 11, 25);
  // En enero se cuenta contra la Navidad que acaba de pasar.
  if (now.getMonth() === 0) xmas.setFullYear(today.getFullYear() - 1);
  return Math.round((xmas.getTime() - today.getTime()) / DAY);
}

export type Greeting = {
  title: string; // "Feliz Navidad"
  /** Cifra grande de la cuenta regresiva (solo antes de Navidad). */
  count: number | null;
  countLabel: string;
  text: string;
};

/** Saludo según la fecha: cuenta regresiva antes de Navidad, felicitación después. */
export function greetingFor(now: Date = new Date()): Greeting {
  const days = daysToChristmas(now);
  const m = now.getMonth();
  const d = now.getDate();

  if (m === 0) {
    return {
      title: "Feliz Año Nuevo",
      count: null,
      countLabel: "",
      text: "Que este año llegue lleno de brillo. Estrena una pieza que cuente tu historia.",
    };
  }
  if (days > 1) {
    return {
      title: "Feliz Navidad",
      count: days,
      countLabel: "días para Navidad",
      text: "Regala brillo: piezas únicas en oro laminado de 18k con empaque de regalo de lujo.",
    };
  }
  if (days === 1) {
    return {
      title: "Es Nochebuena",
      count: null,
      countLabel: "",
      text: "Mañana es Navidad. Escríbenos y te ayudamos a elegir el regalo ideal.",
    };
  }
  if (days === 0) {
    return {
      title: "¡Feliz Navidad!",
      count: null,
      countLabel: "",
      text: "Gracias por ser parte de nuestra familia. Que este día brille contigo.",
    };
  }
  return {
    title: m === 11 && d >= 31 ? "Feliz Año Nuevo" : "Felices fiestas",
    count: null,
    countLabel: "",
    text: "Gracias por acompañarnos esta temporada. Te deseamos un año lleno de brillo.",
  };
}