// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Post editorial /editorial/[slug]
//
// Server Component con SSG + ISR. Renderiza el cuerpo markdown
// (react-markdown) con linking interno real: los <a href="/local/...">
// del markdown se renderizan como <Link> para navegación SPA,
// y abajo se listan los locales mencionados (cards a /local/[slug]).
// JSON-LD: Article + BreadcrumbList en un solo @graph.
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CalendarDays, ArrowRight, MapPin, Star, Sparkles } from 'lucide-react';
import Markdown, { type Components } from 'react-markdown';
import { db } from '@/lib/db';
import WeekendFlyersGrid, { type FlyerEvent } from '@/components/conecta/WeekendFlyersGrid';
import {
  SITE_URL,
  categoryLabel,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo';

export const revalidate = 3600;

// ── Datos ────────────────────────────────────────────────────

async function getPost(slug: string) {
  return db.editorialPost.findUnique({
    where: { slug },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      body: true,
      weekOf: true,
      publishedAt: true,
      updatedAt: true,
      status: true,
      businesses: {
        select: {
          name: true,
          slug: true,
          category: { select: { name: true } },
          zone: { select: { name: true } },
          avgRating: true,
          reviewCount: true,
          priceRange: true,
          coverImage: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });
}

type PostData = NonNullable<Awaited<ReturnType<typeof getPost>>>;

// Sprint 8.11 — flyers PUBLICADOS de la misma semana del post, para
// que lo que suben los dueños también se refleje en la guía (página 2).
async function getWeekendEvents(weekOf: Date): Promise<FlyerEvent[]> {
  const rows = await db.businessEvent.findMany({
    where: { status: 'PUBLISHED', weekOf },
    orderBy: [{ startsAt: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      title: true,
      tagline: true,
      emoji: true,
      theme: true,
      dayLabel: true,
      dateLabel: true,
      timeLabel: true,
      priceNote: true,
      promoNote: true,
      imageUrl: true,
      business: {
        select: {
          name: true,
          slug: true,
          zone: { select: { name: true } },
          address: true,
          phone: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    tagline: row.tagline,
    emoji: row.emoji,
    theme: row.theme,
    dayLabel: row.dayLabel,
    dateLabel: row.dateLabel,
    timeLabel: row.timeLabel,
    priceNote: row.priceNote,
    promoNote: row.promoNote,
    imageUrl: row.imageUrl,
    business: {
      name: row.business.name,
      slug: row.business.slug,
      zone: row.business.zone?.name ?? null,
      address: row.business.address,
      phone: row.business.phone,
    },
  }));
}

// SSG: pre-genera los posts publicados; si la DB cae en build,
// devuelve [] y se generan on-demand (el build no muere).
export async function generateStaticParams() {
  try {
    const posts = await db.editorialPost.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
    });
    return posts.map((p) => ({ slug: p.slug }));
  } catch (error) {
    console.error('[editorial/[slug]] generateStaticParams: DB no disponible', error);
    return [];
  }
}

// ── Metadatos (SEO + sharing) ────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  let post: PostData | null = null;
  try {
    post = await getPost(slug);
  } catch (error) {
    console.error('[editorial/[slug]] generateMetadata: DB no disponible', error);
  }

  if (!post || post.status !== 'PUBLISHED') {
    return { title: 'Guía no encontrada' };
  }

  const ogImage = post.businesses.find((b) => b.coverImage)?.coverImage ?? '/images/hero.png';

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/editorial/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/editorial/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
      siteName: 'CONECTA-LT',
      locale: 'es_VE',
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`,
          width: 1344,
          height: 768,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`],
    },
  };
}

// ── Render markdown ──────────────────────────────────────────

// Los links internos (/local/..., /editorial/...) se renderizan
// como <Link> (navegación client-side); los externos abren en
// pestaña nueva. Estilos alineados con las fichas /local.
const markdownComponents: Components = {
  a({ href, children }) {
    if (href && href.startsWith('/')) {
      return (
        <Link
          href={href}
          className="text-gold font-medium hover:underline underline-offset-2"
        >
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold font-medium hover:underline underline-offset-2"
      >
        {children}
      </a>
    );
  },
  h2({ children }) {
    return (
      <h2 className="font-serif text-2xl text-gold mt-10 mb-4 first:mt-0">{children}</h2>
    );
  },
  h3({ children }) {
    return <h3 className="font-serif text-xl text-white mt-8 mb-3">{children}</h3>;
  },
  p({ children }) {
    return <p className="text-white/75 leading-relaxed mb-4">{children}</p>;
  },
  ul({ children }) {
    return <ul className="space-y-3 mb-6 list-none">{children}</ul>;
  },
  li({ children }) {
    return (
      <li className="text-white/75 leading-relaxed pl-5 relative before:content-['—'] before:absolute before:left-0 before:text-gold">
        {children}
      </li>
    );
  },
  strong({ children }) {
    return <strong className="text-white font-semibold">{children}</strong>;
  },
  em({ children }) {
    return <em className="text-white/50">{children}</em>;
  },
  code({ children }) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-gold/10 border border-gold/25 text-gold text-[0.85em] font-mono">
        {children}
      </code>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-gold/40 pl-4 italic text-white/60 mb-4">
        {children}
      </blockquote>
    );
  },
};

// ── Helpers ──────────────────────────────────────────────────

function formatWeek(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
}

// ── Página ───────────────────────────────────────────────────

export default async function EditorialPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  let post: PostData | null = null;
  let weekendEvents: FlyerEvent[] = [];
  try {
    post = await getPost(slug);
    if (post && post.status === 'PUBLISHED') {
      weekendEvents = await getWeekendEvents(post.weekOf);
    }
  } catch (error) {
    console.error('[editorial/[slug]] page: DB no disponible', error);
  }

  if (!post || post.status !== 'PUBLISHED') {
    notFound();
  }

  const jsonLd = serializeJsonLd([
    buildArticleJsonLd({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      imageUrl: post.businesses.find((b) => b.coverImage)?.coverImage ?? null,
    }),
    buildBreadcrumbJsonLd([
      { name: 'Inicio', path: '/' },
      { name: 'Editorial', path: '/editorial' },
      { name: post.title, path: `/editorial/${post.slug}` },
    ]),
  ]);

  return (
    <main className="min-h-screen bg-obsidian text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <article className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Breadcrumbs visibles (coherentes con el JSON-LD) */}
        <nav aria-label="Ruta de navegación" className="text-sm text-white/50 mb-6">
          <Link href="/" className="hover:text-gold transition-colors">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/editorial" className="hover:text-gold transition-colors">Editorial</Link>
          <span className="mx-2">›</span>
          <span className="text-white/80">Fin de semana del {formatWeek(post.weekOf)}</span>
        </nav>

        {/* Encabezado */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
              <CalendarDays size={12} />
              Fin de semana del {formatWeek(post.weekOf)}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/60 text-xs">
              <Sparkles size={11} />
              Guía semanal CONECTA-LT
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-gold leading-tight mb-4">
            {post.title}
          </h1>
          <p className="text-white/70 leading-relaxed text-base sm:text-lg border-l-2 border-gold/40 pl-4">
            {post.excerpt}
          </p>
        </header>

        {/* Cuerpo markdown con links internos a /local/[slug] */}
        <div className="mb-12">
          <Markdown components={markdownComponents}>{post.body}</Markdown>
        </div>

        {/* Sprint 8.11 — los flyers de los dueños, también en la guía */}
        {weekendEvents.length > 0 && (
          <section aria-label="Flyers del fin de semana" className="mb-12">
            <h2 className="font-serif text-2xl text-gold mt-10 mb-2">
              Los flyers de este fin de semana
            </h2>
            <p className="text-white/60 text-sm mb-5">
              Lo publicado por los locales para esta semana — toca un flyer
              y ve directo a su ficha.
            </p>
            <WeekendFlyersGrid events={weekendEvents} />
          </section>
        )}

        {/* Locales mencionados — linking interno garantizado */}
        {post.businesses.length > 0 && (
          <section aria-label="Locales mencionados en esta guía" className="mb-12">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gold/80 mb-4">
              Locales mencionados en esta guía ({post.businesses.length})
            </h2>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {post.businesses.map((b) => (
                <li key={b.slug}>
                  <Link
                    href={`/local/${b.slug}`}
                    className="glass-card rounded-xl p-3 flex items-center gap-3 hover:border-gold/40 transition-colors group"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10">
                      <Image
                        src={b.coverImage ?? '/images/hero.png'}
                        alt={b.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white/90 text-sm truncate group-hover:text-gold transition-colors">
                          {b.name}
                        </span>
                        {b.reviewCount > 0 && b.avgRating > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-gold font-mono shrink-0">
                            <Star size={10} className="fill-gold" />
                            {b.avgRating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate mt-0.5">
                        {categoryLabel(b.category.name)}
                        {b.zone?.name ? ` · ${b.zone.name}` : ''}
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">{b.priceRange}</span>
                      </p>
                    </div>
                    <ArrowRight
                      size={14}
                      className="text-white/30 group-hover:text-gold transition-colors shrink-0"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA a la app interactiva */}
        <section className="rounded-2xl border border-gold/30 bg-gold/10 p-6 text-center mb-10">
          <h2 className="font-serif text-xl text-gold mb-2">¿Listo para el fin de semana?</h2>
          <p className="text-white/70 text-sm mb-4">
            Reserva tu mesa, canjea las promociones de esta guía y mira el aforo en
            tiempo real desde la app de CONECTA-LT.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-obsidian font-semibold hover:bg-gold/90 transition-all"
          >
            Abrir CONECTA-LT <ArrowRight size={16} />
          </Link>
        </section>

        <p className="text-center text-sm text-white/50">
          <Link href="/editorial" className="hover:text-gold transition-colors">
            ← Ver todas las guías del fin de semana
          </Link>
        </p>
      </article>
    </main>
  );
}
