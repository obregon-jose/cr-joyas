import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="section-title">Esta pieza <span className="gold-text italic">no existe</span></h1>
      <p className="max-w-md text-white/55">Puede que se haya agotado, que ya no esté en la tienda o que el enlace esté incompleto.</p>
      <Link href="/#catalogo" className="btn-gold">Ver el catálogo</Link>
    </main>
  );
}