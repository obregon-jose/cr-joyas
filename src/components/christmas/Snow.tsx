"use client";

import { useEffect, useRef } from "react";

// Nieve dorada: copos suaves en champán y oro con unos destellos que titilan.
// Un solo <canvas> fijo, sin eventos de mouse. Se pausa al cambiar de pestaña y se adapta al tamaño de la pantalla.

type Flake = { x: number; y: number; r: number; vy: number; sway: number; freq: number; phase: number; sprite: number; alpha: number };
type Spark = { x: number; y: number; size: number; phase: number; speed: number };

// Colores de los copos (r, g, b): blanco cálido, champán, oro claro y un toque de oro rosa.
const PALETTE: [number, number, number][] = [
  [255, 248, 235],
  [255, 248, 235],
  [245, 223, 143],
  [233, 200, 92],
  [232, 180, 160],
];

function makeSprite(rgb: [number, number, number], size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const h = size / 2;
  const grad = g.createRadialGradient(h, h, 0, h, h, h);
  grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
  grad.addColorStop(0.4, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
  grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export default function Snow({ calm = false }: { calm?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sprites = PALETTE.map((p) => makeSprite(p, 64));
    let w = 0;
    let h = 0;
    let dpr = 1;
    let flakes: Flake[] = [];
    let sparks: Spark[] = [];
    let raf = 0;
    let last = 0;
    let wind = 0; // empuje horizontal según el puntero, suavizado
    let windTarget = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const makeFlake = (anywhere: boolean): Flake => {
      const r = rand(1.6, 5.2); // radio visible; los más grandes caen más rápido (parecen más cercanos)
      return {
        x: rand(0, w),
        y: anywhere ? rand(0, h) : rand(-30, -4),
        r,
        vy: (16 + r * 8 + rand(0, 10)) * (calm ? 0.55 : 1),
        sway: rand(6, 20),
        freq: rand(0.4, 1.1),
        phase: rand(0, Math.PI * 2),
        sprite: Math.floor(Math.random() * sprites.length),
        alpha: rand(0.35, 0.9),
      };
    };

    const setup = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const small = w < 640;
      const count = Math.round(Math.min(small ? 38 : 95, (w * h) / (small ? 14000 : 17000)) * (calm ? 0.6 : 1));
      flakes = Array.from({ length: count }, () => makeFlake(true));
      sparks = Array.from({ length: small ? 6 : 12 }, () => ({
        x: rand(0, w),
        y: rand(0, h),
        size: rand(3, 6.5),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.8, 1.8) * (calm ? 0.5 : 1),
      }));
    };

    const drawStar = (x: number, y: number, s: number, a: number) => {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, y);
      ctx.fillStyle = "#f5df8f";
      ctx.shadowColor = "rgba(245,223,143,0.9)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      // Estrella de cuatro puntas
      ctx.moveTo(0, -s * 2);
      ctx.quadraticCurveTo(0, 0, s * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, s * 2);
      ctx.quadraticCurveTo(0, 0, -s * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s * 2);
      ctx.fill();
      ctx.restore();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05); // evita saltos tras una pausa
      last = now;
      const t = now / 1000;
      wind += (windTarget - wind) * Math.min(1, dt * 2);
      const breeze = Math.sin(t * 0.35) * 9 + wind;

      ctx.clearRect(0, 0, w, h);

      for (const f of flakes) {
        f.y += f.vy * dt;
        f.x += (Math.sin(t * f.freq + f.phase) * f.sway + breeze * (f.r / 4)) * dt;
        if (f.y - f.r > h) Object.assign(f, makeFlake(false));
        if (f.x < -20) f.x = w + 20;
        else if (f.x > w + 20) f.x = -20;
        const d = f.r * 2.6;
        ctx.globalAlpha = f.alpha;
        ctx.drawImage(sprites[f.sprite], f.x - d / 2, f.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;

      for (const s of sparks) {
        const a = Math.max(0, Math.sin(t * s.speed + s.phase));
        if (a > 0.02) drawStar(s.x, s.y, s.size * (0.6 + a * 0.5), a * 0.85);
        else if (Math.random() < 0.02) {
          // Cuando se apaga, reaparece en otro lugar
          s.x = rand(0, w);
          s.y = rand(0, h);
        }
      }
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(setup, 150);
    };
    const onPointer = (e: PointerEvent) => {
      windTarget = (e.clientX / Math.max(w, 1) - 0.5) * 60; // el viento sigue suavemente al cursor
    };

    setup();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      stop();
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [calm]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[40] h-full w-full" />;
}