// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Directorio SSR de locales (enlaces internos)
//
// Server Component renderizado en el SSR de la home (inyectado
// desde src/app/page.tsx como prop `directory` de HomeShell).
// Responde al análisis GSC 2026-10-08: la home SSR tenía CERO
// enlaces internos hacia las fichas /local/[slug] (todo el flujo
// era SPA cliente) y 32 fichas estaban "Descubierta: actualmente
// sin indexar" — Google solo las descubría vía sitemap, sin el
// flujo de enlaces internos que impulsa la indexación.
//
// Sin 'use client': HTML puro en el SSR, cero JS extra, cero CLS
// (el bloque ya viene en el HTML inicial, no se monta después).
// prefetch desactivado: ~33 links en pantalla dispararían ese
// número de RSC prefetch en móvil (datos móviles vs. ganancia).
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import { categoryLabel } from '@/lib/seo';

export type DirectoryLocale = {
  slug: string;
  name: string;
  categoryName: string | null;
};

export function LocalesDirectory({ locales }: { locales: DirectoryLocale[] }) {
  // Sin datos (build sin DB accesible, error transitorio de Neon):
  // la sección no se renderiza — la home queda exactamente como
  // antes, sin bloque vacío ni heading huérfano.
  if (locales.length === 0) return null;

  // Agrupar por categoría: la query ya ordena por categoría + nombre,
  // así que basta con agrupar runs consecutivos.
  const groups: { label: string; items: DirectoryLocale[] }[] = [];
  for (const b of locales) {
    const label = b.categoryName
      ? categoryLabel(b.categoryName)
      : 'Otros';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(b);
    else groups.push({ label, items: [b] });
  }

  return (
    <section
      aria-labelledby="locales-directory-title"
      className="relative z-10 border-t border-white/5 bg-obsidian/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h2
          id="locales-directory-title"
          className="font-mono text-xs tracking-[0.2em] uppercase text-white/40 mb-6"
        >
          Directorio · Todos los locales
        </h2>
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.label}>
              <h3 className="font-mono text-[11px] tracking-wider uppercase text-gold/70 mb-2">
                {g.label}
              </h3>
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {g.items.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/local/${b.slug}`}
                      prefetch={false}
                      className="text-sm text-white/60 hover:text-gold transition-colors"
                    >
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
