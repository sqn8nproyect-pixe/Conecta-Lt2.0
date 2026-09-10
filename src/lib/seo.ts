// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Helpers SEO (JSON-LD / Schema.org)
//
// Centraliza la construcción de datos estructurados para las
// páginas server-rendered (/local/[slug]) y cualquier otra que
// los necesite. Cumple las políticas de Google:
//   - AggregateRating SOLO se emite si reviewCount > 0
//     (rating sin reseñas = riesgo de manual action).
//   - Un solo bloque JSON-LD por página (usar @graph).
// ─────────────────────────────────────────────────────────────

export const SITE_URL = 'https://conectalt.com';

/** Label en español para títulos/metadata. */
export function categoryLabel(categoryName: string): string {
  const clean = categoryName.trim();
  if (!clean) return 'Local';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Subtipo de schema.org según la categoría del negocio.
 * Heredan de LocalBusiness, así que todas las propiedades válidas.
 */
export function categoryToSchemaType(categoryName: string): string {
  switch (categoryName.toLowerCase().trim()) {
    case 'licorería':
    case 'licoreria':
      return 'LiquorStore';
    case 'discoteca':
      return 'NightClub';
    case 'tasca':
    case 'licobar':
      return 'BarOrPub';
    default:
      return 'LocalBusiness';
  }
}

/** Convierte dayOfWeek numérico (0=Dom … 6=Sáb) al nombre ISO de schema.org. */
const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

interface HourRow {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/**
 * Agrupa los BusinessHours en OpeningHoursSpecification sin duplicados:
 * días con el mismo horario comparten spec. Los días cerrados se omiten
 * (schema.org no tiene "cerrado" — simplemente no se declara).
 * Cruces de medianoche (closeTime < openTime) son válidos para Google.
 */
export function buildOpeningHours(hours: HourRow[]) {
  const open = hours.filter((h) => !h.isClosed && h.openTime && h.closeTime);
  const groups = new Map<string, { openTime: string; closeTime: string; days: number[] }>();

  for (const h of open) {
    const key = `${h.openTime}|${h.closeTime}`;
    if (!groups.has(key)) {
      groups.set(key, { openTime: h.openTime, closeTime: h.closeTime, days: [] });
    }
    groups.get(key)!.days.push(h.dayOfWeek);
  }

  return [...groups.values()].map((g) => ({
    '@type': 'OpeningHoursSpecification' as const,
    dayOfWeek: g.days
      .slice()
      .sort((a, b) => a - b)
      .map((d) => DAY_NAMES[d]),
    opens: g.openTime,
    closes: g.closeTime,
  }));
}

export interface LocalBusinessInput {
  name: string;
  slug: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  phone: string | null;
  priceRange: string;
  coverImage: string | null;
  avgRating: number;
  reviewCount: number;
  categoryName: string;
  cityName: string | null;
  zoneName: string | null;
  instagramUrl: string | null;
  hours: HourRow[];
}

/**
 * LocalBusiness (o subtipo) completo para la página /local/[slug].
 * - AggregateRating solo con reviewCount > 0.
 * - image/sameAs/telephone solo si existen (no se inventan datos).
 */
export function buildLocalBusinessJsonLd(b: LocalBusinessInput) {
  const url = `${SITE_URL}/local/${b.slug}`;

  const jsonLd: Record<string, unknown> = {
    '@type': categoryToSchemaType(b.categoryName),
    '@id': `${url}#local`,
    name: b.name,
    description: b.description,
    url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address,
      addressLocality: b.cityName ?? 'Los Teques',
      addressRegion: 'Miranda',
      addressCountry: 'VE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: b.lat,
      longitude: b.lng,
    },
    priceRange: b.priceRange || '$$',
    hasMap: `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`,
  };

  if (b.coverImage) {
    jsonLd.image = `${SITE_URL}${b.coverImage}`;
  }
  if (b.phone) {
    jsonLd.telephone = b.phone;
  }
  if (b.instagramUrl) {
    jsonLd.sameAs = [b.instagramUrl];
  }
  // La zona ayuda a Google a desambiguar barrios de Los Teques.
  if (b.zoneName && !b.address.includes(b.zoneName)) {
    jsonLd.address = {
      ...jsonLd.address as Record<string, unknown>,
      streetAddress: `${b.address}${b.address ? ', ' : ''}${b.zoneName}`,
    };
  }
  const openingHours = buildOpeningHours(b.hours);
  if (openingHours.length > 0) {
    jsonLd.openingHoursSpecification = openingHours;
  }
  if (b.reviewCount > 0 && b.avgRating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Math.round(b.avgRating * 10) / 10,
      reviewCount: b.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return jsonLd;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** BreadcrumbList con URLs absolutas (requisito de Google). */
export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

/**
 * Serializa el @graph de una página a JSON para el tag
 * <script type="application/ld+json">. Un solo bloque por página.
 */
export function serializeJsonLd(graph: Record<string, unknown>[]): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
