// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Directorio público indexable /local
//
// Hub server-rendered (SSG + ISR) que lista los locales activos
// agrupados por categoría y enlaza a cada ficha /local/[slug].
// Sirve de nivel intermedio del BreadcrumbList y de página de
// linking interno para el rastreo de Google.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, Star, ArrowRight } from 'lucide-react';
import { db } from '@/lib/db';
import { SITE_URL, categoryLabel } from '@/lib/seo';

export const revalidate = 3600;

const CATEGORY_ORDER = ['licorería', 'tasca', 'discoteca', 'licobar'] as const;

async function getBusinesses() {
  return db.business.findMany({
    where: { status: 'ACTIVE' },
    select: {
      name: true,
      slug: true,
      address: true,
      avgRating: true,
      reviewCount: true,
      priceRange: true,
      category: { select: { name: true } },
      zone: { select: { name: true } },
    },
    orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
  });
}

type BusinessRow = Awaited<ReturnType<typeof getBusinesses>>[number];

export const metadata: Metadata = {
  title: 'Locales de Los Teques — Directorio nocturno completo',
  description:
    'Directorio completo de licorerías, tascas, discotecas y licobares de Los Teques, Miranda. Fichas con horarios verificados, dirección, teléfono, Instagram y reseñas reales.',
  alternates: { canonical: '/local' },
  openGraph: {
    title: 'Locales de Los Teques — Directorio nocturno completo | CONECTA-LT',
    description:
      'Todas las licorerías, tascas, discotecas y licobares de Los Teques en un solo lugar, con horarios y datos verificados.',
    url: `${SITE_URL}/local`,
    type: 'website',
    siteName: 'CONECTA-LT',
    locale: 'es_VE',
  },
};

export default async function LocalesDirectoryPage() {
  let businesses: BusinessRow[] = [];
  try {
    businesses = await getBusinesses();
  } catch (error) {
    console.error('[local] directory: DB no disponible', error);
  }

  // Agrupar por categoría respetando el orden editorial.
  const groups = new Map<string, BusinessRow[]>();
  for (const cat of CATEGORY_ORDER) groups.set(cat, []);
  for (const b of businesses) {
    const key = b.category.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }

  return (
    <main className="min-h-screen bg-obsidian text-white">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-white/50">
          <Link href="/" className="hover:text-gold transition-colors">Inicio</Link>
          <span className="mx-2">›</span>
          <span className="text-white/80">Locales</span>
        </nav>

        <header className="mb-10">
          <h1 className="font-serif text-3xl sm:text-4xl text-gold mb-3">
            Todos los locales de Los Teques
          </h1>
          <p className="text-white/75 leading-relaxed">
            {businesses.length} locales verificados: licorerías, tascas, discotecas y
            licobares con horarios, direcciones y reseñas de la comunidad. Elige un
            local para ver su ficha completa con mapa, contactos y promociones activas.
          </p>
        </header>

        {businesses.length === 0 && (
          <p className="text-white/60">El directorio se está actualizando. Vuelve en unos minutos.</p>
        )}

        {[...groups.entries()]
          .filter(([, rows]) => rows.length > 0)
          .map(([cat, rows]) => (
            <section key={cat} aria-label={categoryLabel(cat)} className="mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gold/80 mb-4">
                {categoryLabel(cat)}{' '}
                <span className="text-white/40 normal-case font-normal">
                  ({rows.length})
                </span>
              </h2>

              <ul className="space-y-3">
                {rows.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/local/${b.slug}`}
                      className="glass-card rounded-xl p-4 flex items-center gap-3 hover:border-gold/40 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-white/90 group-hover:text-gold transition-colors">
                            {b.name}
                          </span>
                          {b.reviewCount > 0 && b.avgRating > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-gold font-mono">
                              <Star size={11} className="fill-gold" />
                              {b.avgRating.toFixed(1)}
                            </span>
                          )}
                          <span className="text-xs font-mono text-white/40">{b.priceRange}</span>
                        </div>
                        <p className="text-sm text-white/50 truncate flex items-center gap-1 mt-1">
                          <MapPin size={12} className="shrink-0" />
                          {b.zone?.name ? `${b.zone.name} · ` : ''}
                          {b.address}
                        </p>
                      </div>
                      <ArrowRight
                        size={16}
                        className="text-white/30 group-hover:text-gold transition-colors shrink-0"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        <p className="text-center text-sm text-white/50 mt-12">
          <Link href="/" className="hover:text-gold transition-colors">
            ← Volver a CONECTA-LT
          </Link>
        </p>
      </div>
    </main>
  );
}
