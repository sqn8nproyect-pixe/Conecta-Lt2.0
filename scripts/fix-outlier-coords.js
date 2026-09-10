/**
 * Corrección de coordenadas outliers (escaneo de sanidad post-Licobar JJ):
 * - Don Sancho: lng -67.043 (19km oeste) → Av. Bolívar con C. Ayacucho (centro, ±200m)
 * - El Emperador: lat 10.349 (en Los Teques) → CC La Cascada, Corralito, Carrizal (aprox)
 * - Pasatiempos: lat 10.347 (en Los Teques) → Vía San Diego, Carrizal (aprox)
 * No se tocan: Africa Burguers (Calle 9 sin precisar — preguntar al usuario),
 * Mercaplus (borderline), Casita de Maikel (plausible, rango era muy estricto).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FIXES = [
  {
    slug: 'licoreria-don-sancho',
    lat: 10.3452,
    lng: -66.8552,
    nota: 'Av. Bolívar con C. Ayacucho, centro de Los Teques (confidente, ±200m)',
  },
  {
    slug: 'disco-el-emperador',
    lat: 10.31,
    lng: -66.99,
    nota: 'CC La Cascada, sector Corralito, Carrizal (aprox, fuente mapcarta/tripadvisor/moovit)',
  },
  {
    slug: 'pasatiempos-grill',
    lat: 10.32,
    lng: -66.985,
    nota: 'Vía San Diego, Carrizal (aprox)',
  },
];

async function main() {
  for (const f of FIXES) {
    const antes = await prisma.business.findUnique({
      where: { slug: f.slug },
      select: { name: true, lat: true, lng: true },
    });
    const b = await prisma.business.update({
      where: { slug: f.slug },
      data: { lat: f.lat, lng: f.lng },
    });
    console.log(
      `✓ ${b.name}: ${antes.lat},${antes.lng} → ${b.lat},${b.lng}\n  (${f.nota})`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
