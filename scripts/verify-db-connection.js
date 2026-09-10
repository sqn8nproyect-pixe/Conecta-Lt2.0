/**
 * Verificación de conexión E2E a Neon PostgreSQL
 * Uso: node scripts/verify-db-connection.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('── Conectando a Neon PostgreSQL...');
  const t0 = Date.now();

  const [countries, cities, businesses, categories, users, reviews] =
    await Promise.all([
      prisma.country.count(),
      prisma.city.count(),
      prisma.business.count(),
      prisma.category.count(),
      prisma.user.count(),
      prisma.review.count(),
    ]);

  const ms = Date.now() - t0;
  console.log(`✅ Conexión OK (${ms}ms)`);
  console.log(`   Country:   ${countries}`);
  console.log(`   City:      ${cities}`);
  console.log(`   Business:  ${businesses}`);
  console.log(`   Category:  ${categories}`);
  console.log(`   User:      ${users}`);
  console.log(`   Review:    ${reviews}`);

  // Muestra 3 negocios como smoke test de datos reales
  const sample = await prisma.business.findMany({
    take: 3,
    select: { id: true, name: true, status: true, cityId: true },
    orderBy: { id: 'asc' },
  });
  console.log('── Muestra de negocios:');
  sample.forEach((b) =>
    console.log(`   [${b.id}] ${b.name} — status=${b.status} cityId=${b.cityId}`)
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('🔴 ERROR de conexión:', e.message.slice(0, 300));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
