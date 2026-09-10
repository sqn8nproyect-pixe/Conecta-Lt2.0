/**
 * Limpieza post-revisión del directorio:
 * 1. Teléfonos "N/A" → null (residuo de plantilla en 4 locales)
 * 2. Zonas reales según dirección: crear zonas faltantes y asignar cada local.
 *
 * Zonas nuevas (todas bajo la ciudad Los Teques, hub Altos Mirandinos):
 *   - Carrizal
 *   - San Antonio de Los Altos
 *   - San Pedro de los Altos
 *   - Panamericana Sur (Km 23-26: Los Cerritos, CC La Matica, El Toro)
 *   - Laguneta y La Llovizna
 *   - Centro (ya existe)
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// slug → zona (según dirección real en la ficha)
const ZONA_POR_LOCAL = {
  // Centro de Los Teques
  'bodegon-bravamar': 'Centro',
  'bodegon-naikel': 'Centro',
  'bodegon-bicentenario': 'Centro',
  'licoreria-don-sancho': 'Centro',
  'licoreria-la-botella-de-oro': 'Centro',
  'licoreria-mis-amores': 'Centro',
  'licoreria-curametono': 'Centro',
  'licoreria-el-barbecho': 'Centro',
  'licoreria-chuky': 'Centro',
  'el-llanero': 'Centro',
  'discoteca-donato': 'Centro',
  'discoteca-koko-frappe': 'Centro',
  'club-centro-de-amigos': 'Centro',
  'new-copacabana': 'Centro',
  'tasca-el-patio': 'Centro',
  'bodegon-panamericana': 'Centro', // tramo urbano de la Panamericana dentro de Los Teques
  'licoreria-la-macarena': 'Centro', // Sector La Macarena, entrada urbana de la Panamericana
  'licobar-punto-de-encuentro': 'Centro', // Sector Guacara, Los Teques

  // Carrizal
  'pasatiempos-grill': 'Carrizal',
  'disco-el-emperador': 'Carrizal',

  // San Antonio de Los Altos
  'daws-lounge': 'San Antonio de Los Altos',
  'scandalo-gastrobar': 'San Antonio de Los Altos',
  'cafe-racer-bar': 'San Antonio de Los Altos',
  'evolution-bar-restaurant': 'San Antonio de Los Altos',

  // San Pedro de los Altos
  'tasca-san-pedro': 'San Pedro de los Altos',

  // Panamericana Sur (corredor Km 23-26 + Camatagua)
  'ranch-grill': 'Panamericana Sur',
  'discoteca-medusa': 'Panamericana Sur',
  'bodegon-el-toro': 'Panamericana Sur',
  'mercaplus-la-fortaleza': 'Panamericana Sur',

  // Laguneta y La Llovizna (vía Lagunetica)
  'la-casita-de-maikel': 'Laguneta y La Llovizna',
  'licoreria-la-llovizna': 'Laguneta y La Llovizna',

  // Sin dirección precisa aún (venues del agente sin zona verificable)
  'jungla-bar': null, // "Los Teques, municipio Guaicaipuro" genérico
  'la-estacion-de-la-birra': null,
};

const ZONAS_NUEVAS = [
  'Carrizal',
  'San Antonio de Los Altos',
  'San Pedro de los Altos',
  'Panamericana Sur',
  'Laguneta y La Llovizna',
];

async function main() {
  const city = await prisma.city.findFirst({ where: { name: 'Los Teques' } });
  if (!city) throw new Error('Ciudad Los Teques no encontrada');
  console.log('Ciudad:', city.name, city.id);

  // 1. Teléfonos N/A → null
  const naFixed = await prisma.business.updateMany({
    where: { phone: 'N/A' },
    data: { phone: null },
  });
  console.log(`\n[1] Teléfonos "N/A" → null: ${naFixed.count}`);

  // 2. Crear zonas faltantes (idempotente)
  const zones = {};
  for (const name of ZONAS_NUEVAS) {
    const z = await prisma.zone.upsert({
      where: { cityId_name: { cityId: city.id, name } },
      create: { name, cityId: city.id },
      update: {},
    });
    zones[name] = z.id;
    console.log(`[2] Zona ok: ${name} (${z.id})`);
  }
  const centro = await prisma.zone.findFirst({
    where: { cityId: city.id, name: 'Centro' },
  });
  zones['Centro'] = centro.id;

  // 3. Asignar zonas
  const negocios = await prisma.business.findMany({ select: { id: true, slug: true, name: true } });
  let asignados = 0;
  let sinZona = [];
  for (const b of negocios) {
    const zonaName = ZONA_POR_LOCAL[b.slug];
    if (zonaName === undefined) {
      throw new Error(`Local sin mapeo de zona: ${b.slug} — añádelo a ZONA_POR_LOCAL`);
    }
    if (zonaName === null) {
      sinZona.push(b.name);
      continue;
    }
    await prisma.business.update({
      where: { id: b.id },
      data: { zoneId: zones[zonaName] },
    });
    asignados++;
  }
  console.log(`\n[3] Locales asignados a zona: ${asignados}`);
  console.log(`    Sin zona (dirección genérica): ${sinZona.join(', ') || '(ninguno)'}`);

  // 4. Verificación
  const resumen = await prisma.business.groupBy({
    by: ['zoneId'],
    _count: true,
  });
  const zoneNames = await prisma.zone.findMany({ where: { cityId: city.id } });
  const nameById = Object.fromEntries(zoneNames.map((z) => [z.id, z.name]));
  console.log('\n[4] Resumen final:');
  for (const r of resumen) {
    console.log(`    ${r.zoneId ? nameById[r.zoneId] || r.zoneId : '(sin zona)'}: ${r._count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
