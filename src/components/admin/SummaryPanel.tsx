"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Banknote, Clock, Receipt, ShoppingBag } from "lucide-react";
import { formatCOP } from "@/lib/format";
import { Order, Product } from "@/lib/types";
import { isLow, isSoldOut, isUnlimited } from "@/lib/catalog/stock";

// Pestaña "Resumen": cifras de ventas calculadas con los pedidos y productos que ya carga el panel.
// Una venta es un pedido pagado, enviado o entregado. Los pendientes se muestran aparte y los cancelados no cuentan.

type Period = "today" | "7d" | "30d" | "month" | "all";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "month", label: "Este mes" },
  { key: "all", label: "Todo" },
];

const SALE = ["pagado", "enviado", "entregado"];
const STATUSES = ["pendiente", "pagado", "enviado", "entregado", "cancelado"];
const DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function periodStart(p: Period, now: Date): Date | null {
  const today = startOfDay(now);
  if (p === "today") return today;
  if (p === "7d") return new Date(today.getTime() - 6 * DAY);
  if (p === "30d") return new Date(today.getTime() - 29 * DAY);
  if (p === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

type Bucket = { label: string; title: string; total: number };

export default function SummaryPanel({ orders, products, onGo }: { orders: Order[]; products: Product[]; onGo: () => void }) {
  const [period, setPeriod] = useState<Period>("30d");

  const data = useMemo(() => {
    const now = new Date();
    const from = periodStart(period, now);
    const inPeriod = orders.filter((o) => !from || new Date(o.created_at) >= from);
    const sales = inPeriod.filter((o) => SALE.includes(o.status));
    const revenue = sales.reduce((s, o) => s + Number(o.total || 0), 0);

    const byStatus: Record<string, number> = {};
    STATUSES.forEach((s) => (byStatus[s] = 0));
    inPeriod.forEach((o) => (byStatus[o.status] = (byStatus[o.status] ?? 0) + 1));

    // Piezas más vendidas
    const top = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of sales) {
      for (const it of o.items ?? []) {
        const row = top.get(String(it.id)) ?? { name: it.name, qty: 0, total: 0 };
        row.qty += it.qty;
        row.total += it.qty * Number(it.price || 0);
        top.set(String(it.id), row);
      }
    }
    const best = [...top.values()].sort((a, b) => b.qty - a.qty || b.total - a.total).slice(0, 5);

    // Ventas por día (o por mes cuando se mira todo el historial)
    const buckets: Bucket[] = [];
    if (period !== "today") {
      if (period === "all") {
        const months = new Map<string, number>();
        for (const o of sales) {
          const d = new Date(o.created_at);
          const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          months.set(k, (months.get(k) ?? 0) + Number(o.total || 0));
        }
        [...months.entries()].sort().slice(-12).forEach(([k, total]) => {
          const [y, m] = k.split("-").map(Number);
          const d = new Date(y, m - 1, 1);
          buckets.push({ label: d.toLocaleDateString("es-CO", { month: "short" }), title: d.toLocaleDateString("es-CO", { month: "long", year: "numeric" }), total });
        });
      } else {
        const start = from!;
        const days = Math.round((startOfDay(now).getTime() - start.getTime()) / DAY) + 1;
        const sums = new Array(days).fill(0) as number[];
        for (const o of sales) {
          const i = Math.floor((startOfDay(new Date(o.created_at)).getTime() - start.getTime()) / DAY);
          if (i >= 0 && i < days) sums[i] += Number(o.total || 0);
        }
        sums.forEach((total, i) => {
          const d = new Date(start.getTime() + i * DAY);
          buckets.push({ label: String(d.getDate()), title: d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" }), total });
        });
      }
    }

    return {
      revenue,
      salesCount: sales.length,
      ordersCount: inPeriod.length,
      average: sales.length ? revenue / sales.length : 0,
      byStatus,
      best,
      buckets,
    };
  }, [orders, period]);

  // Pedidos pendientes y stock bajo se miran siempre, sin importar el periodo.
  const pendingAll = useMemo(() => orders.filter((o) => o.status === "pendiente").length, [orders]);
  const lowStock = useMemo(
    () =>
      products
        .filter((p) => p.active !== false && !isUnlimited(p) && (isSoldOut(p) || isLow(p)))
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 8),
    [products]
  );

  const max = Math.max(1, ...data.buckets.map((b) => b.total));

  const cards = [
    { icon: Banknote, label: "Ventas", value: formatCOP(data.revenue), hint: `${data.salesCount} ${data.salesCount === 1 ? "pedido pagado" : "pedidos pagados"}` },
    { icon: Receipt, label: "Pedido promedio", value: data.salesCount ? formatCOP(data.average) : "—", hint: "entre los pagados" },
    { icon: ShoppingBag, label: "Pedidos recibidos", value: String(data.ordersCount), hint: "incluye pendientes y cancelados" },
    { icon: Clock, label: "Por atender", value: String(pendingAll), hint: "pendientes de pago (todos)" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl">Resumen</h2>
          <p className="mt-1 text-sm text-white/50">Las ventas cuentan desde que el pedido pasa a pagado, y se ubican en la fecha en que se hizo el pedido.</p>
        </div>
        <div className="flex rounded-full border border-white/10 p-1 text-xs uppercase tracking-widest">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-2 transition ${period === p.key ? "bg-gold-300 text-ink-950" : "text-white/60 hover:text-gold-200"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ icon: Icon, label, value, hint }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-ink-900 p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/45">
              <Icon className="h-4 w-4 text-gold-300" /> {label}
            </p>
            <p className="gold-text mt-3 font-serif text-3xl">{value}</p>
            <p className="mt-1 text-xs text-white/35">{hint}</p>
          </div>
        ))}
      </div>

      {data.buckets.length > 0 && (
        <section className="rounded-2xl border border-white/5 bg-ink-900 p-5">
          <h3 className="eyebrow mb-4">{period === "all" ? "Ventas por mes" : "Ventas por día"}</h3>
          {data.revenue === 0 ? (
            <p className="py-8 text-center text-sm text-white/40">Aún no hay ventas en este periodo.</p>
          ) : (
            <div className="flex h-44 items-end gap-1" role="img" aria-label="Gráfico de ventas">
              {data.buckets.map((b, i) => (
                <div key={i} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end" title={`${b.title}: ${formatCOP(b.total)}`}>
                  <div
                    className={`w-full rounded-t-sm transition ${b.total > 0 ? "bg-gold-300/80 group-hover:bg-gold-200" : "bg-white/10"}`}
                    style={{ height: b.total > 0 ? `${Math.max(4, (b.total / max) * 100)}%` : "2px" }}
                  />
                </div>
              ))}
            </div>
          )}
          {data.revenue > 0 && (
            <div className="mt-2 flex gap-1 text-[10px] text-white/35">
              {data.buckets.map((b, i) => (
                <span key={i} className="min-w-0 flex-1 truncate text-center">
                  {data.buckets.length > 16 && i % 2 === 1 ? "" : b.label}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/5 bg-ink-900 p-5">
          <h3 className="eyebrow mb-4">Pedidos por estado</h3>
          <ul className="space-y-2.5 text-sm">
            {STATUSES.map((s) => (
              <li key={s} className="flex items-center justify-between gap-3">
                <span className="capitalize text-white/70">{s}</span>
                <span className="flex items-center gap-3">
                  <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-white/10 sm:block">
                    <span className="block h-full rounded-full bg-gold-300/80" style={{ width: `${data.ordersCount ? (data.byStatus[s] / data.ordersCount) * 100 : 0}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-gold-100">{data.byStatus[s]}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/5 bg-ink-900 p-5">
          <h3 className="eyebrow mb-4">Piezas más vendidas</h3>
          {data.best.length === 0 ? (
            <p className="py-4 text-sm text-white/40">Sin ventas en este periodo.</p>
          ) : (
            <ol className="space-y-3 text-sm">
              {data.best.map((b, i) => (
                <li key={b.name + i} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs text-gold-200">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-white/80">{b.name}</span>
                  <span className="shrink-0 text-xs text-white/45">{b.qty} {b.qty === 1 ? "unidad" : "unidades"}</span>
                  <span className="w-28 shrink-0 text-right tabular-nums text-gold-100">{formatCOP(b.total)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-white/5 bg-ink-900 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="eyebrow flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Stock bajo</h3>
          <button onClick={onGo} className="text-xs uppercase tracking-widest text-white/50 transition hover:text-gold-200">Ir a productos →</button>
        </div>
        {lowStock.length === 0 ? (
          <p className="text-sm text-white/40">Todo en orden: ninguna pieza con stock limitado está por agotarse.</p>
        ) : (
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {lowStock.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-2.5">
                <span className="truncate text-white/80">{p.name}</span>
                <span className={`shrink-0 text-xs uppercase tracking-widest ${p.stock <= 0 ? "text-rose-gold" : "text-gold-300"}`}>
                  {p.stock <= 0 ? "Agotada" : `${p.stock} ${p.stock === 1 ? "unidad" : "unidades"}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}