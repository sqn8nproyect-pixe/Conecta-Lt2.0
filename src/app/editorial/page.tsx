// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Hub editorial /editorial
//
// Listado server-rendered (SSG + ISR) de los posts publicados
// "Qué hacer este fin de semana en Los Teques". Nivel medio del
// BreadcrumbList y página de linking interno hacia los posts.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { Metadata } from 'next';
import { CalendarDays, ArrowRight, MapPin, Newspaper } from 'lucide-react';
import { db } from '@/lib/db';
import {
  SITE_URL,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo';

export const revalidate = 3600;

async function getPosts() {
  return db.editorialPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { weekOf: 'desc' },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      weekOf: true,
      _count: { select: { businesses: true } },
      businesses: { select: { zone: { select: { name: true } } } },
    },
  });
}

type PostRow = Awaited<ReturnType<typeof getPosts>>[number];

export const metadata: Metadata = {
  title: 'Editorial — Qué hacer este fin de semana en Los Teques',
  description:
    'Guías semanales de vida nocturna en Los Teques y los Altos Mirandinos: promociones vigentes, discotecas, tascas y licobares con horarios verificados. Publicado por CONECTA-LT.',
  alternates: { canonical: '/editorial' },
  openGraph: {
    title: 'Editorial — Qué hacer este fin de semana en Los Teques | CONECTA-LT',
    description:
      'Guías semanales con promos vigentes, horarios verificados y planes para el fin de semana en Los Teques.',
    url: `${SITE_URL}/editorial`,
    type: 'website',
    siteName: 'CONECTA-LT',
    locale: 'es_VE',
  },
};

/** "12 de septiembre" determinista (weekOf se guarda a medianoche UTC). */
function formatWeek(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

export default async function EditorialHubPage() {
  let posts: PostRow[] = [];
  try {
    posts = await getPosts();
  } catch (error) {
    console.error('[editorial] hub: DB no disponible', error);
  }

  const jsonLd = serializeJsonLd([
    buildBreadcrumbJsonLd([
      { name: 'Inicio', path: '/' },
      { name: 'Editorial', path: '/editorial' },
    ]),
  ]);

  return (
    <main className="min-h-screen bg-obsidian text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-white/50">
          <Link href="/" className="hover:text-gold transition-colors">Inicio</Link>
          <span className="mx-2">›</span>
          <span className="text-white/80">Editorial</span>
        </nav>

        <header className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Newspaper size={12} /> Guía semanal
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-gold mb-3">
            Qué hacer este fin de semana en Los Teques
          </h1>
          <p className="text-white/75 leading-relaxed">
            Cada semana publicamos la guía con las promociones vigentes, los horarios
            verificados de discotecas, tascas y licobares, y los mejores planes para
            Los Teques y los Altos Mirandinos. Todos los datos provienen de las fichas
            del directorio, así que lo que lees aquí lo puedes verificar local por local.
          </p>
        </header>

        {posts.length === 0 && (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-white/60 text-sm">
              Todavía no hay guías publicadas. La primera edición llega este fin de
              semana — vuelve en unos días.
            </p>
          </div>
        )}

        <ul className="space-y-4">
          {posts.map((post) => {
            return (
              <li key={post.slug}>
                <Link
                  href={`/editorial/${post.slug}`}
                  className="glass-card rounded-2xl p-5 sm:p-6 block hover:border-gold/40 transition-colors group"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-semibold">
                      <CalendarDays size={12} />
                      Fin de semana del {formatWeek(post.weekOf)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/60 text-xs">
                      <MapPin size={11} />
                      {post._count.businesses} locales
                    </span>
                  </div>

                  <h2 className="font-serif text-xl sm:text-2xl text-white group-hover:text-gold transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-white/60 text-sm leading-relaxed line-clamp-3 mb-3">
                    {post.excerpt}
                  </p>

                  <span className="inline-flex items-center gap-1.5 text-gold text-sm font-medium">
                    Leer la guía
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="text-center text-sm text-white/50 mt-12">
          <Link href="/" className="hover:text-gold transition-colors">
            ← Volver a CONECTA-LT
          </Link>
        </p>
      </div>
    </main>
  );
}
