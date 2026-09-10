// Investigación para el Sprint 8 — post editorial v1
// Extrae: locales ACTIVE con categoría/zona/rating, horarios Vie+Sáb,
// y promociones ACTIVE vigentes (para citar hechos reales, no inventar).
// Ejecutar: unset DATABASE_URL DIRECT_URL; node scripts/editorial-research.mjs
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const businesses = await db.business.findMany({
  where: { status: 'ACTIVE' },
  select: {
    name: true,
    slug: true,
    specialty: true,
    valueProposition: true,
    avgRating: true,
    reviewCount: true,
    priceRange: true,
    address: true,
    category: { select: { name: true } },
    zone: { select: { name: true } },
    hours: {
      where: { dayOfWeek: { in: [5, 6] } },
      select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true },
    },
    promotions: {
      where: { status: 'ACTIVE' },
      select: {
        title: true,
        description: true,
        discount: true,
        price: true,
        code: true,
        endDate: true,
      },
    },
  },
  orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
});

console.log(`TOTAL ACTIVE: ${businesses.length}\n`);

// Con promos activas
const withPromos = businesses.filter((b) => b.promotions.length > 0);
console.log(`===== CON PROMOS ACTIVAS (${withPromos.length}) =====`);
for (const b of withPromos) {
  for (const p of b.promotions) {
    const end = p.endDate ? p.endDate.toISOString().slice(0, 10) : 'sin fecha fin';
    console.log(`• ${b.name} [${b.category.name}] — ${p.title}${p.discount ? ` (${p.discount})` : ''}${p.price ? ` ${p.price}` : ''} — vence ${end} — code: ${p.code ?? 'n/a'}`);
  }
}

// Mejor valorados con reviews
console.log('\n===== TOP RATING (≥4.0, con reviews) =====');
const top = businesses
  .filter((b) => b.reviewCount >= 3 && b.avgRating >= 4.0)
  .sort((a, b) => b.avgRating - a.avgRating);
for (const b of top.slice(0, 15)) {
  const vie = b.hours.find((h) => h.dayOfWeek === 5 && !h.isClosed);
  const sab = b.hours.find((h) => h.dayOfWeek === 6 && !h.isClosed);
  const fmt = (h) => (h ? `${h.openTime}-${h.closeTime}` : 'cerrado');
  console.log(`• ${b.name} [${b.category.name}] ${b.zone?.name ?? '—'} — ${b.avgRating.toFixed(1)} (${b.reviewCount}) ${b.priceRange} — Vie:${fmt(vie)} Sáb:${fmt(sab)} — ${b.specialty ?? ''}`);
}

// Abiertos sábado por la noche (discotecas/tascas/licobares)
console.log('\n===== ABIERTOS SÁBADO NOCHE (cierra >= 22:00) =====');
const night = businesses.filter((b) => {
  const sab = b.hours.find((h) => h.dayOfWeek === 6 && !h.isClosed);
  if (!sab) return false;
  const close = parseInt(sab.closeTime.split(':')[0], 10);
  return close >= 22 || close <= 4; // cruza medianoche
});
for (const b of night) {
  const sab = b.hours.find((h) => h.dayOfWeek === 6 && !h.isClosed);
  console.log(`• ${b.name} [${b.category.name}] ${b.zone?.name ?? '—'} — Sáb ${sab.openTime}-${sab.closeTime} — ${b.avgRating.toFixed(1)} (${b.reviewCount})`);
}

// Licorerías con datos completos (para sección de "previa")
console.log('\n===== LICORERÍAS (muestra 6) =====');
for (const b of businesses.filter((x) => x.category.name === 'licorería').slice(0, 6)) {
  const sab = b.hours.find((h) => h.dayOfWeek === 6 && !h.isClosed);
  console.log(`• ${b.name} ${b.zone?.name ?? '—'} — Sáb ${sab ? `${sab.openTime}-${sab.closeTime}` : 'cerrado'} — ${b.specialty ?? 'sin especialidad'}`);
}

await db.$disconnect();
