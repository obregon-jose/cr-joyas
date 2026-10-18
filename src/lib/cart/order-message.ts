import { formatCOP } from "@/lib/format";

type Line = { name: string; price: number; qty: number };

type Customer = {
  customer_name: string;
  phone: string;
  email?: string;
  city: string;
  address: string;
  notes?: string | null;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

function itemsBlock(items: Line[]) {
  const pieces = items.reduce((s, i) => s + i.qty, 0);
  const many = items.length > 1;
  const lines = items
    .map((i, k) => `${many ? `${k + 1}.` : "•"} ${i.name}\n   ${i.qty} × ${formatCOP(i.price)} = ${formatCOP(i.qty * i.price)}`)
    .join("\n\n");
  return { pieces, lines };
}

/** Mensaje que el cliente envía a la tienda por WhatsApp. */
export function buildOrderMessage(o: {
  number?: number | null;
  brand: string;
  customer: Customer;
  items: Line[];
  total: number;
}) {
  const { pieces, lines } = itemsBlock(o.items);
  const c = o.customer;
  const parts = [
    `*Nuevo pedido${o.number ? ` #${o.number}` : ""} · ${o.brand}*`,
    "",
    "*Cliente*",
    `Nombre: ${c.customer_name}`,
    `Teléfono: ${c.phone}`,
    ...(c.email ? [`Correo: ${c.email}`] : []),
    `Ciudad: ${c.city}`,
    `Dirección: ${c.address}`,
    "",
    `*${plural(pieces, "Pieza solicitada", "Piezas solicitadas")}* (${pieces})`,
    lines,
    "",
    `*Total: ${formatCOP(o.total)}*`,
    ...(c.notes?.trim() ? ["", `*Notas:* ${c.notes.trim()}`] : []),
    "",
    "Quedo atento(a) para confirmar el pago y el envío. ¡Gracias!",
  ];
  return parts.join("\n");
}

/** Mensaje que la tienda envía al cliente desde el admin. */
export function buildCustomerMessage(o: {
  number?: number | null;
  brand: string;
  customer: Customer;
  items: Line[];
  total: number;
}) {
  const { pieces, lines } = itemsBlock(o.items);
  const first = o.customer.customer_name.trim().split(/\s+/)[0] || "";
  return [
    `Hola${first ? ` ${first}` : ""}, te escribimos de ${o.brand} por tu pedido${o.number ? ` #${o.number}` : ""}.`,
    "",
    `*${plural(pieces, "Pieza", "Piezas")}* (${pieces})`,
    lines,
    "",
    `*Total: ${formatCOP(o.total)}*`,
    "",
    `Envío a: ${o.customer.address}, ${o.customer.city}`,
    "",
    "¿Confirmamos estos datos para coordinar el pago y el envío?",
  ].join("\n");
}

/** Teléfono colombiano de 10 dígitos (3xx...) → con indicativo 57. Otros números se respetan. */
export function phoneToWa(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("3") ? `57${digits}` : digits;
}