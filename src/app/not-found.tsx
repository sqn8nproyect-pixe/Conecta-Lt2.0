// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Página 404 de marca (auditoría SEO 2026-10-08)
//
// Antes no existía not-found.tsx: los 404 heredaban el robots
// "index, follow" del layout junto al "noindex" automático de
// Next → directivas de robots CONFLICTIVAS en una sola página.
// Aquí el metadata robots (noindex) REEMPLAZA al del layout →
// una sola directiva coherente. Bonus: 404 con marca y salidas
// reales en vez de la página genérica de Next.
// ─────────────────────────────────────────────────────────────

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  // Sin sufijo: el template del layout añade " | CONECTA-LT"
  title: 'Página no encontrada',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-background text-foreground px-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 text-gold text-2xl font-black font-serif mb-6">
          ?
        </div>
        <h1 className="font-serif text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
          404
        </h1>
        <p className="text-white/60 leading-relaxed mb-8">
          Esta página no existe o fue movida. La noche de Los Teques
          sigue en su lugar:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold/15 border border-gold/40 text-gold px-5 py-3 text-sm font-semibold hover:bg-gold/25 transition-colors"
          >
            Volver al inicio
          </Link>
          <Link
            href="/local"
            className="inline-flex items-center justify-center gap-2 rounded-xl glass-card border border-white/10 text-white/80 px-5 py-3 text-sm font-semibold hover:border-gold/30 transition-colors"
          >
            Ver los locales
          </Link>
        </div>
      </div>
    </main>
  );
}
