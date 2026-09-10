/**
 * Corrección de direcciones tras feedback del usuario:
 * - "Sector Guacara" NO existe en Los Teques (Guacara es de Carabobo)
 *   → Licobar JJ pierde la dirección falsa del seed
 * - La Estación de la Birra: dirección real (IG/FB/TikTok/AlcaStars, 4 fuentes)
 * - Jungla Bar: dirección real (IG oficial: Mercado Municipal de El Paso, zona licorera)
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 1. Licobar JJ — eliminar dirección falsa del seed
  const jj = await prisma.business.update({
    where: { slug: 'licobar-punto-de-encuentro' },
    data: {
      address: 'Los Teques, municipio Guaicaipuro',
    },
  });
  console.log('[1] Licobar JJ:', jj.address, '| zona se mantiene Centro (pendiente dirección real)');

  // 2. La Estación de la Birra — dirección real (Av. Bertorelli Cisneros, El Cabotaje)
  const panamSur = await prisma.zone.findFirst({ where: { name: 'Panamericana Sur' } });
  const estacion = await prisma.business.update({
    where: { slug: 'la-estacion-de-la-birra' },
    data: {
      address: 'Av. Bertorelli Cisneros, sector El Cabotaje, al lado del Electroauto, Los Teques',
      zoneId: panamSur.id,
    },
  });
  console.log('[2] La Estación de la Birra:', estacion.address, '| zona: Panamericana Sur');

  // socials reales de La Estación (IG bio + TikTok bio verificados en investigación)
  const socialsEstacion = [
    { type: 'INSTAGRAM', value: '@laestaciondelabirra' },
    { type: 'TIKTOK', value: 'https://tiktok.com/@laestaciondelabirra' },
  ];
  for (const s of socialsEstacion) {
    await prisma.businessSocial.upsert({
      where: {
        businessId_type: {
          businessId: estacion.id,
          type: s.type,
        },
      },
      create: { businessId: estacion.id, type: s.type, value: s.value },
      update: { value: s.value },
    });
  }
  console.log('    socials IG+TikTok @laestaciondelabirra upsertados');

  // 3. Jungla Bar — dirección real (IG oficial)
  const jungla = await prisma.business.update({
    where: { slug: 'jungla-bar' },
    data: {
      address: 'Mercado Municipal de El Paso, zona licorera, Los Teques',
    },
  });
  console.log('[3] Jungla Bar:', jungla.address, '| zona: Centro (El Paso es sector central)');

  // 4. Verificación: ningún negocio con "Guacara" en la dirección
  const guacara = await prisma.business.count({
    where: { address: { contains: 'Guacara' } },
  });
  console.log('\n[4] Negocios con "Guacara" en dirección:', guacara);

  const sinDir = await prisma.business.findMany({
    where: { address: 'Los Teques, municipio Guaicaipuro' },
    select: { name: true },
  });
  console.log('    Direcciones genéricas restantes:', sinDir.map((b) => b.name).join(', ') || '(ninguna)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
