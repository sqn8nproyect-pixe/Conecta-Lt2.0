// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Portada editorial /editorial (Sprint 8.7)
//
// REDESIGN: la gente no lee — mira. La primera pantalla es un
// MURO DE FLYERS (12 eventos de los dueños de locales, 0 párrafos
// largos). La guía escrita "Qué hacer este fin de semana" queda
// como segunda página, enlazada al pie del muro con un CTA corto.
//
// SSG + ISR (revalidate 3600). JSON-LD: BreadcrumbList +
// ItemList de eventos (enlazan a las fichas /local/[slug]).
// ─────────────────────────────────────────────────────────────

import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, CalendarDays, Newspaper } from 'lucide-react';
import { db } from '@/lib/db';
import WeekendFlyersGrid, { type FlyerEvent } from '@/components/conecta/WeekendFlyersGrid';
import {
  SITE_URL,
  buildBreadcrumbJsonLd,
  serializeJsonLd,
} from '@/lib/seo';

export const revalidate = 3600;

async function getWeekendData() {
  // 1) La semana con eventos publicados más reciente.
  const latest = await db.businessEvent.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { weekOf: 'desc' },
    select: { weekOf: true },
  });
  if (!latest) return { events: [] as FlyerEvent[], post: null };

  // 2) Eventos de esa semana, en orden cronológico.
  const rows = await db.businessEvent.findMany({
    where: { status: 'PUBLISHED', weekOf: latest.weekOf },
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

  const events: FlyerEvent[] = rows.map((row) => ({
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

  // 3) La guía escrita (segunda página) de la misma semana.
  const post = await db.editorialPost.findFirst({
    where: { status: 'PUBLISHED' },
    orderBy: { weekOf: 'desc' },
    select: { slug: true, title: true },
  });

  return { events, post };
}

/** Rango "11 · 12 y 13 de septiembre" a partir de los eventos.
 *  Parse directo de los dateLabel ("11 SEP") — sin Date/Intl,
 *  para que el rango no dependa de la zona horaria del server. */
const MONTH_ES: Record<string, string> = {
  ENE: 'enero', FEB: 'febrero', MAR: 'marzo', ABR: 'abril', MAY: 'mayo',
  JUN: 'junio', JUL: 'julio', AGO: 'agosto', SEP: 'septiembre',
  OCT: 'octubre', NOV: 'noviembre', DIC: 'diciembre',
};

function formatWeekendRange(events: FlyerEvent[]): string {
  const seen = new Set<string>();
  const days: string[] = [];
  let month = '';
  for (const ev of events) {
    if (!seen.has(ev.dateLabel)) {
      seen.add(ev.dateLabel);
      const [day, mon] = ev.dateLabel.split(' ');
      days.push(day);
      month = MONTH_ES[mon?.toUpperCase()] ?? '';
    }
  }
  if (days.length === 0) return '';
  const joined = days.length === 1 ? days[0] : `${days.slice(0, -1).join(' · ')} y ${days[days.length - 1]}`;
  return `${joined} de ${month}`.trim();
}

export const metadata: Metadata = {
  title: 'Qué hacer este fin de semana en Los Teques — Eventos y flyers',
  description:
    'Los 12 eventos del fin de semana en Los Teques en flyers de un vistazo: rumba, promos y planes de los locales de los Altos Mirandinos, con horarios verificados.',
  alternates: { canonical: '/editorial' },
  openGraph: {
    title: 'Qué hacer este fin de semana en Los Teques | CONECTA-LT',
    description:
      'Los eventos del fin de semana en flyers de un vistazo: rumba, promos y planes de los locales de Los Teques y los Altos Mirandinos.',
    url: `${SITE_URL}/editorial`,
    type: 'website',
    siteName: 'CONECTA-LT',
    locale: 'es_VE',
  },
};

export default async function EditorialCoverPage() {
  let events: FlyerEvent[] = [];
  let post: { slug: string; title: string } | null = null;
  try {
    const data = await getWeekendData();
    events = data.events;
    post = data.post;
  } catch (error) {
    console.error('[editorial] portada: DB no disponible', error);
  }

  const range = formatWeekendRange(events);

  const jsonLd = serializeJsonLd([
    buildBreadcrumbJsonLd([
      { name: 'Inicio', path: '/' },
      { name: 'Editorial', path: '/editorial' },
    ]),
    ...(events.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Eventos del fin de semana en Los Teques',
            numberOfItems: events.length,
            itemListElement: events.map((ev, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${ev.title} — ${ev.business.name}`,
              url: `${SITE_URL}/local/${ev.business.slug}`,
            })),
          },
        ]
      : []),
  ]);

  return (
    <main className="min-h-screen bg-obsidian text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <nav aria-label="Ruta de navegación" className="text-sm text-white/50 mb-5">
          <Link href="/" className="hover:text-gold transition-colors">Inicio</Link>
          <span className="mx-2">›</span>
          <span className="text-white/80">Fin de semana</span>
        </nav>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-wider mb-3">
            <CalendarDays size={12} />
            {range ? `Fin de semana del ${range}` : 'Fin de semana'}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-gold mb-2">
            Qué hacer este fin de semana en Los Teques
          </h1>
          <p className="text-white/70 text-sm sm:text-base">
            Los 12 eventos de la semana en flyers. Toca uno y ve directo a la rumba.
          </p>
        </header>

        {events.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-white/60 text-sm">
              Los flyers del próximo fin de semana se publican el viernes —
              vuelve en unos días.
            </p>
          </div>
        ) : (
          <WeekendFlyersGrid events={events} />
        )}

        {/* ── La guía completa (segunda página) ─────────────── */}
        {post && (
          <Link
            href={`/editorial/${post.slug}`}
            className="group mt-8 glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:border-gold/40 transition-colors"
          >
            <span className="shrink-0 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gold/15 border border-gold/30 text-gold">
              <Newspaper size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-gold mb-0.5">
                La guía completa · los detalles y horarios
              </span>
              <span className="block truncate text-sm sm:text-base text-white group-hover:text-gold transition-colors">
                {post.title}
              </span>
            </span>
            <ArrowRight
              size={18}
              className="shrink-0 ml-auto text-gold group-hover:translate-x-1 transition-transform"
            />
          </Link>
        )}

        <p className="text-center text-sm text-white/50 mt-10">
          <Link href="/" className="hover:text-gold transition-colors">
            ← Volver a CONECTA-LT
          </Link>
        </p>
      </div>
    </main>
  );
}
