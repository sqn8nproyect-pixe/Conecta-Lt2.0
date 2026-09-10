// Verificación de datos para el Sprint 7A (sitemap + JSON-LD)
// Confirma: total ACTIVE, slugs únicos, reviews (avgRating/reviewCount),
// horarios estructurados, socials, covers y updatedAt.
// Ejecutar: unset DATABASE_URL DIRECT_URL; node scripts/seo-check-data.mjs
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const businesses = await db.business.findMany({
  where: { status: 'ACTIVE' },
  select: {
    slug: true,
    name: true,
    updatedAt: true,
    avgRating: true,
    reviewCount: true,
    address: true,
    phone: true,
    coverImage: true,
    priceRange: true,
    category: { select: { name: true, slug: true } },
    zone: { select: { name: true } },
    city: { select: { name: true } },
    hours: { select: { dayOfWeek: true, openTime: true, closeTime: true, isClosed: true } },
    socials: { select: { type: true, value: true } },
  },
  orderBy: { name: 'asc' },
});

console.log(`Total ACTIVE: ${businesses.length}`);
const withReviews = businesses.filter((b) => b.reviewCount > 0);
console.log(`Con reviews (reviewCount>0): ${withReviews.length}`);
withReviews.forEach((b) => console.log(`  - ${b.slug}: ${b.avgRating.toFixed(1)} (${b.reviewCount})`));
const withHours = businesses.filter((b) => b.hours.length > 0);
console.log(`Con horarios estructurados: ${withHours.length}/33`);
const withIG = businesses.filter((b) => b.socials.some((s) => s.type === 'INSTAGRAM'));
console.log(`Con Instagram: ${withIG.length}/33`);
const withPhone = businesses.filter((b) => b.phone);
console.log(`Con teléfono: ${withPhone.length}/33`);
const slugs = new Set(businesses.map((b) => b.slug));
console.log(`Slugs únicos: ${slugs.size}`);
const cats = {};
businesses.forEach((b) => (cats[b.category.name] = (cats[b.category.name] || 0) + 1));
console.log('Categorías:', cats);
console.log('Ejemplo (primer negocio):');
console.log(JSON.stringify(businesses[0], null, 2).slice(0, 1200));

await db.$disconnect();
