// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Ficha pública indexable /local/[slug]
//
// Server Component con SSG + ISR (revalidate 1h). Es la URL que
// Google indexa: HTML con el contenido real del local + JSON-LD
// (LocalBusiness/LiquorStore/NightClub/BarOrPub + BreadcrumbList
// + AggregateRating solo si reviewCount > 0).
//
// La app interactiva (reservas, favoritos, mapa) sigue siendo la
// SPA en / — esta ficha enlaza a ella con /?local=<slug>.
// ─────────────────────────────────────────────────────────────

import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MapPin, Clock, Phone, Instagram, Star, ArrowRight, Users } from 'lucide-react';
import { db } from '@/lib/db';
import { formatSchedule } from '@/server/services/business.service';
import {
  SITE_URL,
  categoryLabel,
  buildLocalBusinessJsonLd,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo';

// ISR: los cambios del dueño/admin se reflejan en ≤1h sin rebuild.
export const revalidate = 3600;

// ── Datos ────────────────────────────────────────────────────

async function getBusiness(slug: string) {
  return db.business.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      description: true,
      address: true,
      lat: true,
      lng: true,
      phone: true,
      priceRange: true,
      coverImage: true,
      avgRating: true,
      reviewCount: true,
      specialty: true,
      valueProposition: true,
      status: true,
      category: { select: { name: true } },
      city: { select: { name: true } },
      zone: { select: { name: true } },
      hours: {
        select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
        orderBy: { dayOfWeek: 'asc' },
      },
      socials: { select: { type: true, value: true } },
    },
  });
}

type BusinessData = NonNullable<Awaited<ReturnType<typeof getBusiness>>>;

// SSG: pre-genera las fichas en build. Si la DB no está
// disponible en build, devolvemos [] y las fichas se generan
// on-demand (dynamicParams=true por defecto) — el build no muere.
export async function generateStaticParams() {
  try {
    const businesses = await db.business.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true },
    });
    return businesses.map((b) => ({ slug: b.slug }));
  } catch (error) {
    console.error('[local/[slug]] generateStaticParams: DB no disponible', error);
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

  let business: BusinessData | null = null;
  try {
    business = await getBusiness(slug);
  } catch (error) {
    console.error('[local/[slug]] generateMetadata: DB no disponible', error);
  }

  if (!business || business.status !== 'ACTIVE') {
    return { title: 'Local no encontrado' };
  }

  const title = `${business.name} — ${categoryLabel(business.category.name)} en ${business.city.name ?? 'Los Teques'}`;
  const description =
    business.description ||
    `${business.name}: ${categoryLabel(business.category.name)} en ${business.zone?.name ?? 'Los Teques'}, Miranda. Horarios, dirección y contactos verificados.`;
  const ogImage = business.coverImage ?? '/images/hero.png';

  return {
    title,
    description,
    alternates: { canonical: `/local/${business.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/local/${business.slug}`,
      type: 'website',
      siteName: 'CONECTA-LT',
      locale: 'es_VE',
      images: [
        {
          url: ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`,
          width: 1344,
          height: 768,
          alt: `${business.name} — CONECTA-LT`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`],
    },
  };
}

// ── Helpers de render ────────────────────────────────────────

function instagramHandle(url: string): string {
  const parts = url.replace(/\/+$/, '').replace(/\?.*$/, '').split('/');
  return parts[parts.length - 1] || 'Instagram';
}

function Stars({ score }: { score: number }) {
  const full = Math.round(score);
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={14}
          className={i < full ? 'fill-gold text-gold' : 'text-white/25'}
        />
      ))}
    </span>
  );
}

// ── Página ───────────────────────────────────────────────────

export default async function LocalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug).toLowerCase();

  let business: BusinessData | null = null;
  try {
    business = await getBusiness(slug);
  } catch (error) {
    console.error('[local/[slug]] page: DB no disponible', error);
  }

  if (!business || business.status !== 'ACTIVE') {
    notFound();
  }

  const catLabel = categoryLabel(business.category.name);
  const instagram = business.socials.find((s) => s.type === 'INSTAGRAM');
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${business.lat},${business.lng}`;
  const scheduleText = formatSchedule(business.hours);

  const jsonLd = serializeJsonLd([
    buildLocalBusinessJsonLd({
      name: business.name,
      slug: business.slug,
      description: business.description,
      address: business.address,
      lat: business.lat,
      lng: business.lng,
      phone: business.phone,
      priceRange: business.priceRange,
      coverImage: business.coverImage,
      avgRating: business.avgRating,
      reviewCount: business.reviewCount,
      categoryName: business.category.name,
      cityName: business.city.name,
      zoneName: business.zone?.name ?? null,
      instagramUrl: instagram?.value ?? null,
      hours: business.hours,
    }),
    buildBreadcrumbJsonLd([
      { name: 'Inicio', path: '/' },
      { name: 'Locales', path: '/local' },
      { name: business.name, path: `/local/${business.slug}` },
    ]),
  ]);

  return (
    <main className="min-h-screen bg-obsidian text-white">
      {/* JSON-LD: un solo bloque @graph (LocalBusiness + BreadcrumbList) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />

      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Breadcrumbs visibles (coherentes con el JSON-LD) */}
        <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-white/50">
          <Link href="/" className="hover:text-gold transition-colors">Inicio</Link>
          <span className="mx-2">›</span>
          <Link href="/local" className="hover:text-gold transition-colors">Locales</Link>
          <span className="mx-2">›</span>
          <span className="text-white/80">{business.name}</span>
        </nav>

        {/* Portada */}
        <div className="relative h-56 sm:h-72 overflow-hidden rounded-2xl border border-gold/20 mb-6">
          <Image
            src={business.coverImage ?? '/images/hero.png'}
            alt={`${business.name} — ${catLabel} en Los Teques`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-transparent" />
        </div>

        {/* Encabezado */}
        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider">
              {catLabel}
            </span>
            {business.zone?.name && (
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/70 text-xs">
                {business.zone.name}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/15 text-white/70 text-xs font-mono">
              {business.priceRange}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-gold mb-3">
            {business.name}
          </h1>

          {business.reviewCount > 0 && business.avgRating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Stars score={business.avgRating} />
              <span className="text-gold font-bold font-mono text-sm">
                {business.avgRating.toFixed(1)}
              </span>
              <span className="text-white/50 text-sm">
                ({business.reviewCount} {business.reviewCount === 1 ? 'reseña' : 'reseñas'})
              </span>
            </div>
          )}

          {business.valueProposition && (
            <p className="text-gold/90 text-sm font-medium mb-2">{business.valueProposition}</p>
          )}
          {business.specialty && (
            <p className="text-white/60 text-sm italic mb-2">Especialidad: {business.specialty}</p>
          )}

          <p className="text-white/75 leading-relaxed">{business.description}</p>
        </header>

        {/* Datos prácticos */}
        <section aria-label="Información práctica" className="space-y-4 mb-10">
          <div className="glass-card rounded-xl p-4 flex items-start gap-3">
            <MapPin size={20} className="text-gold shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-white/90 mb-1">Dirección</h2>
              <p className="text-white/70 text-sm">{business.address}</p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-gold text-sm hover:underline"
              >
                Ver en Google Maps <ArrowRight size={14} />
              </a>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-gold shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-white/90 mb-1">Horario</h2>
              <p className="text-white/70 text-sm">{scheduleText}</p>
            </div>
          </div>

          {business.phone && (
            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
              <Phone size={20} className="text-gold shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-white/90 mb-1">Teléfono</h2>
                <a
                  href={`tel:${business.phone}`}
                  className="text-white/70 text-sm hover:text-gold transition-colors"
                >
                  {business.phone}
                </a>
              </div>
            </div>
          )}

          {instagram && (
            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
              <Instagram size={20} className="text-gold shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-white/90 mb-1">Instagram</h2>
                <a
                  href={instagram.value}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 text-sm hover:text-gold transition-colors"
                >
                  {instagramHandle(instagram.value)}
                </a>
              </div>
            </div>
          )}

          {business.reviewCount > 0 && (
            <div className="glass-card rounded-xl p-4 flex items-start gap-3">
              <Users size={20} className="text-gold shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-white/90 mb-1">Valoraciones</h2>
                <p className="text-white/70 text-sm">
                  {business.avgRating.toFixed(1)} / 5 según {business.reviewCount}{' '}
                  {business.reviewCount === 1 ? 'reseña de usuarios' : 'reseñas de usuarios'} en
                  CONECTA-LT (ambiente, servicio y precio-calidad).
                </p>
              </div>
            </div>
          )}
        </section>

        {/* CTA a la app interactiva */}
        <section className="rounded-2xl border border-gold/30 bg-gold/10 p-6 text-center mb-10">
          <h2 className="font-serif text-xl text-gold mb-2">
            Planifica tu salida con la app
          </h2>
          <p className="text-white/70 text-sm mb-4">
            Reserva tu mesa, guarda favoritos, descubre promociones activas y mira el
            aforo en tiempo real desde CONECTA-LT.
          </p>
          <Link
            href={`/?local=${business.slug}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gold text-obsidian font-semibold hover:bg-gold/90 transition-all"
          >
            Abrir ficha interactiva <ArrowRight size={16} />
          </Link>
        </section>

        {/* Linking interno: back al directorio */}
        <p className="text-center text-sm text-white/50">
          <Link href="/local" className="hover:text-gold transition-colors">
            ← Ver todos los locales de Los Teques
          </Link>
        </p>
      </div>
    </main>
  );
}
