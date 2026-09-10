/**
 * Pins exactos de Google Maps enviados por el usuario (lote 2):
 * Medusa, Ranch Grill, Mercaplus, La Estación.
 * Extraídos del marcador !3d...!4d... de cada link resuelto.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PINS = [
  {
    slug: 'discoteca-medusa',
    lat: 10.337378,
    lng: -67.0394874,
    googlePlace: 'Medusa Restaurante Disco Bar',
    fuente: 'maps.app.goo.gl/Fyfq7CTogYfdV8aU7',
  },
  {
    slug: 'ranch-grill',
    lat: 10.347115,
    lng: -67.019501,
    googlePlace: 'Ranch Grill',
    fuente: 'maps.app.goo.gl/9e8dA81ASgR1bWUu7',
  },
  {
    slug: 'mercaplus-la-fortaleza',
    lat: 10.332984,
    lng: -67.0424898,
    googlePlace: 'Mercaplus La Fortaleza',
    fuente: 'maps.app.goo.gl/61EDU8979wXePFxL9',
  },
  {
    slug: 'la-estacion-de-la-birra',
    lat: 10.3338621,
    lng: -67.04263,
    googlePlace: 'Licoreria La estación de la birra y el licor, c.a',
    fuente: 'maps.app.goo.gl/KTx2TjKHfUWys831A',
  },
];

async function main() {
  for (const pin of PINS) {
    const antes = await prisma.business.findUnique({
      where: { slug: pin.slug },
      select: { name: true, lat: true, lng: true, zone: true },
    });
    if (!antes) throw new Error('No existe: ' + pin.slug);
    const dist = Math.sqrt(
      Math.pow((antes.lat - pin.lat) * 111, 2) +
        Math.pow((antes.lng - pin.lng) * 105, 2)
    ); // km aprox (lon ajustado por cos(10.34°))
    await prisma.business.update({
      where: { slug: pin.slug },
      data: { lat: pin.lat, lng: pin.lng },
    });
    console.log(
      `✓ ${antes.name} [${antes.zone?.name}]\n    ${antes.lat.toFixed(4)},${antes.lng.toFixed(4)} → ${pin.lat},${pin.lng}\n    desplazamiento de la aproximación: ${dist.toFixed(1)} km | Google: "${pin.googlePlace}"\n    ${pin.fuente}`
    );
  }

  // Verificación final de rango Panamericana Sur
  const zona = await prisma.zone.findFirst({ where: { name: 'Panamericana Sur' } });
  const locales = await prisma.business.findMany({ where: { zoneId: zona.id } });
  console.log('\nPanamericana Sur (' + locales.length + ' locales):');
  for (const b of locales) {
    console.log(`  ${b.name.padEnd(38)} ${b.lat.toFixed(4)}, ${b.lng.toFixed(4)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
