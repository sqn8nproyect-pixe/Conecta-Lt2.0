/**
 * Licobar JJ: dirección real (usuario) + coordenadas aproximadas al CC Hito.
 * Además: escaneo de sanidad de coordenadas de los 33 locales por rango
 * geográfico de Altos Mirandinos (reporte, sin auto-fix).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Rangos aproximados por zona (lat, lng) para detectar outliers groseros
const RANGOS = {
  Centro: { lat: [10.32, 10.37], lng: [-66.88, -66.82] },
  'Panamericana Sur': { lat: [10.28, 10.35], lng: [-66.89, -66.80] },
  'San Antonio de Los Altos': { lat: [10.37, 10.41], lng: [-66.98, -66.92] },
  Carrizal: { lat: [10.27, 10.32], lng: [-67.03, -66.97] },
  'San Pedro de los Altos': { lat: [10.38, 10.42], lng: [-66.93, -66.87] },
  'Laguneta y La Llovizna': { lat: [10.33, 10.37], lng: [-66.88, -66.82] },
};

async function main() {
  // 1. Licobar JJ — dirección real del usuario + coords aprox al CC Hito
  // (CC Hito: entre Calle Carabobo y Bulevar Bermúdez, centro de Los Teques)
  const jj = await prisma.business.update({
    where: { slug: 'licobar-punto-de-encuentro' },
    data: {
      address: 'Calle Carabobo, diagonal al CC Hito, Los Teques',
      lat: 10.3443,
      lng: -66.855,
    },
  });
  console.log('[1] Licobar JJ →', jj.address, '| coords:', jj.lat, jj.lng, '(aprox. bloque CC Hito)');

  // 2. Escaneo de sanidad del resto
  const negocios = await prisma.business.findMany({
    include: { zone: true },
    orderBy: { name: 'asc' },
  });
  console.log('\n[2] Escaneo de sanidad de coordenadas:');
  let ok = 0;
  const sospechosos = [];
  for (const b of negocios) {
    if (b.slug === 'licobar-punto-de-encuentro') {
      console.log(`  ✓ (recién corregido) ${b.name}`);
      ok++;
      continue;
    }
    const rango = RANGOS[b.zone?.name];
    const fuera =
      !rango ||
      b.lat < rango.lat[0] ||
      b.lat > rango.lat[1] ||
      b.lng < rango.lng[0] ||
      b.lng > rango.lng[1];
    if (fuera) {
      sospechosos.push({ name: b.name, zone: b.zone?.name || '(sin zona)', lat: b.lat, lng: b.lng, addr: b.address });
      console.log(`  ⚠ ${b.name} [${b.zone?.name || 'sin zona'}] lat:${b.lat} lng:${b.lng} — fuera de rango de su zona`);
      console.log(`    addr: ${b.address}`);
    } else {
      ok++;
    }
  }
  console.log(`\n    En rango: ${ok}/${negocios.length} | Sospechosos: ${sospechosos.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
