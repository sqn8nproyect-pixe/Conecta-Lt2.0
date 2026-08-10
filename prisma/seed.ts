// ─────────────────────────────────────────────────────────────
// Conecta-LT 3.0 — Seed inicial
// Migra los 21 negocios, 42 promociones, 16 usuarios y 84 reviews
// desde src/lib/data.ts (datos hardcodeados) a PostgreSQL (Neon).
// ─────────────────────────────────────────────────────────────

import { PrismaClient, type SocialType } from '@prisma/client';
import { establishments, offers, initialReviews } from '../src/lib/data';

const prisma = new PrismaClient();

// ── Utilidades ───────────────────────────────────────────────

/** Convierte un nombre a slug URL-friendly. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Convierte "08:00 AM" → "08:00", "08:30 PM" → "20:30" (formato 24h). */
function parseTime12to24(time12: string): string {
  const m = time12.trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return time12;
  let h = parseInt(m[1]!, 10);
  const min = m[2]!;
  const period = m[3]!.toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${min}`;
}

/** Mapa de abreviaciones de días en español → número (0=Dom … 6=Sáb). */
const DAY_MAP: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mié: 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6,
};

/**
 * Parsea un rango de días en español → array de números.
 * Soporta rangos que cruzan el fin de semana: "Jue-Dom" → [4,5,6,0].
 */
function parseDayRange(range: string): number[] {
  const parts = range.split('-').map((s) => s.trim().toLowerCase());
  if (parts.length !== 2) return [0, 1, 2, 3, 4, 5, 6];
  const start = DAY_MAP[parts[0]!];
  const end = DAY_MAP[parts[1]!];
  if (start === undefined || end === undefined) return [0, 1, 2, 3, 4, 5, 6];
  const days: number[] = [];
  let current = start;
  for (let i = 0; i < 7; i++) {
    days.push(current);
    if (current === end) break;
    current = (current + 1) % 7;
  }
  return days;
}

/**
 * Parsea el string de horario del data.ts al formato BusinessHours.
 * Ej: "08:00 AM - 08:30 PM (Lun-Sáb)" → 6 registros (Lun…Sáb, 08:00–20:30).
 */
function parseSchedule(
  schedule: string,
): { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[] {
  // Formato esperado: "HH:MM AM - HH:MM PM (DayRange)"
  const m = schedule.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*\(([^)]+)\)/i,
  );
  if (!m) {
    // Si no matchea, crear horario default todos los días 9-22
    return [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      dayOfWeek: dow,
      openTime: '09:00',
      closeTime: '22:00',
      isClosed: false,
    }));
  }
  const openTime = parseTime12to24(m[1]!);
  const closeTime = parseTime12to24(m[2]!);
  const days = parseDayRange(m[3]!);
  return days.map((dow) => ({
    dayOfWeek: dow,
    openTime,
    closeTime,
    isClosed: false,
  }));
}

// ── Datos de usuarios para reviews ───────────────────────────

const REVIEW_USERS = [
  { id: 'u1', name: 'Carlos Mendoza', avatar: 'https://i.pravatar.cc/40?img=12' },
  { id: 'u2', name: 'María López', avatar: 'https://i.pravatar.cc/40?img=28' },
  { id: 'u3', name: 'Jean Gómez', avatar: 'https://i.pravatar.cc/40?img=33' },
  { id: 'u4', name: 'Andrea Fernández', avatar: 'https://i.pravatar.cc/40?img=5' },
  { id: 'u5', name: 'José Pereira', avatar: 'https://i.pravatar.cc/40?img=15' },
  { id: 'u6', name: 'Luisana Ramírez', avatar: 'https://i.pravatar.cc/40?img=44' },
  { id: 'u7', name: 'Roberto Silva', avatar: 'https://i.pravatar.cc/40?img=51' },
  { id: 'u8', name: 'Daniela Torres', avatar: 'https://i.pravatar.cc/40?img=9' },
  { id: 'u9', name: 'Francisco Herrera', avatar: 'https://i.pravatar.cc/40?img=60' },
  { id: 'u10', name: 'Carolina Vargas', avatar: 'https://i.pravatar.cc/40?img=20' },
  { id: 'u11', name: 'Eduardo Marín', avatar: 'https://i.pravatar.cc/40?img=68' },
  { id: 'u12', name: 'Sofía Castro', avatar: 'https://i.pravatar.cc/40?img=30' },
  { id: 'u13', name: 'Manuel Rojas', avatar: 'https://i.pravatar.cc/40?img=14' },
  { id: 'u14', name: 'Valentina Díaz', avatar: 'https://i.pravatar.cc/40?img=23' },
  { id: 'u15', name: 'Ricardo Blanco', avatar: 'https://i.pravatar.cc/40?img=58' },
  { id: 'u16', name: 'Gabriela Mora', avatar: 'https://i.pravatar.cc/40?img=49' },
];

// ── Colores por categoría (para pines del mapa) ──────────────

const CATEGORY_COLORS: Record<string, string> = {
  'licorería': '#d4af37', // gold
  'tasca': '#F59E0B',     // amber
  'discoteca': '#C026D3', // purple
};

// ── Seed principal ───────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed de Conecta-LT 3.0...\n');

  // Limpiar datos existentes (orden importa por FKs)
  console.log('🧹 Limpiando datos existentes...');
  await prisma.notification.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.businessImage.deleteMany();
  await prisma.businessSocial.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.business.deleteMany();
  await prisma.category.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.city.deleteMany();
  await prisma.state.deleteMany();
  await prisma.country.deleteMany();
  await prisma.user.deleteMany();
  console.log('   ✓ Datos limpiados\n');

  // ── 1. Geografía: Venezuela → Miranda → Los Teques ─────────
  console.log('🌎 Creando jerarquía geográfica...');
  const venezuela = await prisma.country.create({
    data: { name: 'Venezuela', isoCode: 'VE' },
  });
  const miranda = await prisma.state.create({
    data: { name: 'Miranda', isoCode: 'M', countryId: venezuela.id },
  });
  const losTeques = await prisma.city.create({
    data: { name: 'Los Teques', slug: 'los-teques', stateId: miranda.id },
  });
  const zonaCentro = await prisma.zone.create({
    data: { name: 'Centro', cityId: losTeques.id },
  });
  console.log('   ✓ Venezuela → Miranda → Los Teques → Centro\n');

  // ── 2. Categorías ──────────────────────────────────────────
  console.log('🏷️  Creando categorías...');
  const categories = await Promise.all(
    (['licorería', 'tasca', 'discoteca'] as const).map((name, i) =>
      prisma.category.create({
        data: {
          name,
          slug: slugify(name),
          color: CATEGORY_COLORS[name],
          sortOrder: i,
        },
      }),
    ),
  );
  const categoryMap = new Map(categories.map((c) => [c.name, c]));
  console.log(`   ✓ ${categories.length} categorías creadas\n`);

  // ── 3. Usuarios (para reviews) ─────────────────────────────
  console.log('👥 Creando usuarios de prueba...');
  const userMap = new Map<string, string>();
  for (const u of REVIEW_USERS) {
    const user = await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: `${u.name.toLowerCase().replace(/[^a-z]/g, '.')}@seed.conecta.lt`,
        image: u.avatar,
        role: 'USER',
      },
    });
    userMap.set(u.id, user.id);
  }
  console.log(`   ✓ ${REVIEW_USERS.length} usuarios creados\n`);

  // ── 4. Negocios (21) ───────────────────────────────────────
  console.log('🏪 Creando 21 negocios...');
  const businessIdMap = new Map<string, string>(); // legacy string ID → new cuid

  for (const est of establishments) {
    const category = categoryMap.get(est.category);
    if (!category) throw new Error(`Categoría no encontrada: ${est.category}`);

    const slug = slugify(est.name);
    const business = await prisma.business.create({
      data: {
        name: est.name,
        slug,
        description: est.description,
        address: est.address,
        lat: est.lat,
        lng: est.lng,
        phone: est.phone,
        priceRange: est.priceRange,
        coverImage: est.coverImage,
        avgRating: est.avgRating,
        reviewCount: est.reviewCount,
        ambienteRating: est.subRatings.ambiente,
        servicioRating: est.subRatings.servicio,
        precioCalidadRating: est.subRatings.precioCalidad,
        specialty: est.specialty,
        valueProposition: est.valueProposition,
        status: 'ACTIVE',
        categoryId: category.id,
        cityId: losTeques.id,
        zoneId: zonaCentro.id,
      },
    });
    businessIdMap.set(est.id, business.id);

    // ── 4a. Horarios estructurados ───────────────────────────
    const hours = parseSchedule(est.schedule);
    await prisma.businessHours.createMany({
      data: hours.map((h) => ({ ...h, businessId: business.id })),
    });

    // ── 4b. Imágenes (cover + gallery) ───────────────────────
    const imageRecords: { url: string; type: 'COVER' | 'GALLERY'; sortOrder: number }[] = [];
    if (est.coverImage) {
      imageRecords.push({ url: est.coverImage, type: 'COVER', sortOrder: 0 });
    }
    est.gallery.forEach((url, i) => {
      imageRecords.push({ url, type: 'GALLERY' as const, sortOrder: i + 1 });
    });
    await prisma.businessImage.createMany({
      data: imageRecords.map((img) => ({ ...img, businessId: business.id })),
    });

    // ── 4c. Redes sociales ───────────────────────────────────
    const socials: { type: SocialType; value: string; sortOrder: number }[] = [];
    // Instagram (del campo legacy o de socialMedia)
    const igUrl = est.socialMedia.instagram || (est.instagram ? `https://instagram.com/${est.instagram.replace('@', '')}` : null);
    if (igUrl) socials.push({ type: 'INSTAGRAM', value: igUrl, sortOrder: 0 });
    if (est.socialMedia.tiktok) socials.push({ type: 'TIKTOK', value: est.socialMedia.tiktok, sortOrder: 1 });
    if (est.socialMedia.facebook) socials.push({ type: 'FACEBOOK', value: est.socialMedia.facebook, sortOrder: 2 });
    if (est.website) socials.push({ type: 'WEBSITE', value: est.website, sortOrder: 3 });
    if (est.phone) socials.push({ type: 'WHATSAPP', value: est.phone, sortOrder: 4 });
    if (socials.length > 0) {
      await prisma.businessSocial.createMany({
        data: socials.map((s) => ({ ...s, businessId: business.id })),
      });
    }
  }
  console.log(`   ✓ ${establishments.length} negocios creados con horarios, imágenes y redes\n`);

  // ── 5. Promociones (42 — 2 por negocio) ────────────────────
  console.log('🎉 Creando promociones...');
  for (const offer of offers) {
    const businessId = businessIdMap.get(offer.establishmentId);
    if (!businessId) {
      console.warn(`   ⚠ Negocio no encontrado para offer ${offer.id} (estId=${offer.establishmentId})`);
      continue;
    }
    await prisma.promotion.create({
      data: {
        businessId,
        title: offer.title,
        description: offer.description,
        price: offer.price,
        discount: offer.discount,
        image: offer.image,
        code: offer.code,
        status: 'ACTIVE',
      },
    });
  }
  console.log(`   ✓ ${offers.length} promociones creadas\n`);

  // ── 6. Reviews (84 — 4 por negocio) ────────────────────────
  console.log('⭐ Creando reviews...');
  for (const review of initialReviews) {
    const businessId = businessIdMap.get(review.establishmentId);
    const userId = userMap.get(review.userId);
    if (!businessId || !userId) {
      console.warn(`   ⚠ Faltan datos para review ${review.id}`);
      continue;
    }
    await prisma.review.create({
      data: {
        businessId,
        userId,
        rating: review.rating,
        comment: review.comment,
        status: 'PUBLISHED',
      },
    });
  }
  console.log(`   ✓ ${initialReviews.length} reviews creadas\n`);

  // ── Resumen final ──────────────────────────────────────────
  const counts = {
    countries: await prisma.country.count(),
    states: await prisma.state.count(),
    cities: await prisma.city.count(),
    zones: await prisma.zone.count(),
    categories: await prisma.category.count(),
    users: await prisma.user.count(),
    businesses: await prisma.business.count(),
    businessHours: await prisma.businessHours.count(),
    businessImages: await prisma.businessImage.count(),
    businessSocials: await prisma.businessSocial.count(),
    promotions: await prisma.promotion.count(),
    reviews: await prisma.review.count(),
  };

  console.log('═══════════════════════════════════════════════');
  console.log('  ✅ SEED COMPLETADO');
  console.log('═══════════════════════════════════════════════');
  console.log(JSON.stringify(counts, null, 2));
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
