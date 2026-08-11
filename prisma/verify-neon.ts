// ─────────────────────────────────────────────────────────────
// verify-neon.ts — Verifica que la conexión a Neon PostgreSQL
// está viva y que los datos sembrados siguen ahí.
//
// Uso:
//   1. Configurar DATABASE_URL y DIRECT_URL en .env (o .env.local)
//   2. bun run prisma/verify-neon.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🔌 Conectando a Neon PostgreSQL…');
  console.log(`   URL: ${maskUrl(process.env.DATABASE_URL ?? '')}`);

  // 1. Conexión cruda
  await db.$queryRaw`SELECT 1`;
  console.log('✅ Conexión OK\n');

  // 2. Listar tablas
  const tables = await db.$queryRaw<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log(`📋 Tablas en schema "public" (${tables.length}):`);
  for (const t of tables) console.log(`   - ${t.table_name}`);
  console.log();

  // 3. Contar registros en las tablas clave
  const counts = {
    Country: await db.country.count(),
    State: await db.state.count(),
    City: await db.city.count(),
    Zone: await db.zone.count(),
    Category: await db.category.count(),
    User: await db.user.count(),
    Business: await db.business.count(),
    BusinessHours: await db.businessHours.count(),
    BusinessSocial: await db.businessSocial.count(),
    BusinessImage: await db.businessImage.count(),
    Promotion: await db.promotion.count(),
    Review: await db.review.count(),
    Favorite: await db.favorite.count(),
    Reservation: await db.reservation.count(),
    CouponRedemption: await db.couponRedemption.count(),
    Notification: await db.notification.count(),
    AnalyticsEvent: await db.analyticsEvent.count(),
  };

  console.log('📊 Conteos por tabla:');
  for (const [table, count] of Object.entries(counts)) {
    const expected = EXPECTED_COUNTS[table as keyof typeof EXPECTED_COUNTS] ?? '?';
    const marker = count === expected ? '✓' : count > 0 ? '⚠' : '✗';
    console.log(`   ${marker} ${table.padEnd(20)} ${String(count).padStart(6)}  (esperado: ${expected})`);
  }
  console.log();

  // 4. Sanity check: 21 businesses activos?
  const activeBusinesses = await db.business.count({ where: { status: 'ACTIVE' } });
  console.log(`🟢 Businesses con status=ACTIVE: ${activeBusinesses} (esperado: 21)`);

  // 5. Sanity check: usuario Ana Rodríguez sigue ahí?
  const ana = await db.user.findFirst({
    where: { email: 'ana.rodriguez@gmail.com' },
    select: { id: true, name: true, email: true, role: true },
  });
  console.log(`👤 Usuario demo (ana.rodriguez@gmail.com):`, ana ?? 'NO ENCONTRADO ⚠');

  // 6. Sanity check: Licorería Don Sancho?
  const donSancho = await db.business.findFirst({
    where: { slug: 'licoreria-don-sancho' },
    select: { id: true, name: true, slug: true, avgRating: true, reviewCount: true },
  });
  console.log(`🥃 Negocio "licoreria-don-sancho":`, donSancho ?? 'NO ENCONTRADO ⚠');

  console.log('\n✨ Verificación completa.');
}

function maskUrl(url: string): string {
  // oculta la password en logs
  return url.replace(/(postgresql:\/\/[^:]+:)[^@]+@/, '$1***@');
}

const EXPECTED_COUNTS = {
  Country: 1,           // VE
  State: 1,             // Miranda
  City: 1,              // Los Teques
  Zone: 1,              // Centro
  Category: 3,          // licorería, tasca, discoteca
  User: 19,
  Business: 21,
  BusinessHours: 147,
  BusinessSocial: 73,
  BusinessImage: 231,
  Promotion: 42,        // 28 ACTIVE + 14 EXPIRED
  Review: 86,
  Favorite: 0,          // variable según uso
  Reservation: 4,
  CouponRedemption: 2,
  Notification: 7,
  AnalyticsEvent: 6025,
};

main()
  .catch((err) => {
    console.error('\n❌ Error de verificación:');
    console.error('   ', err.message);
    if ('code' in err) console.error('   code:', (err as { code: string }).code);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
