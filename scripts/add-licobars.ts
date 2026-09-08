// ─────────────────────────────────────────────────────────────
// Conecta-LT — Script incremental: Categoría "Licobar" + 7 locales
//
// Un "licobar" es una licorería donde puedes SENTARTE a tomar tus
// cervezas ahí mismo (mesas, neverones, picadas) — concepto clásico
// de Los Teques. Este script:
//   1. Crea la categoría 'licobar' (pin esmeralda #10B981) — upsert
//   2. Crea 7 negocios licobar con horarios, imágenes, redes,
//      reviews de bienvenida y 1 promo activa — upsert por slug
//
// ⚠️ NO es destructivo: es idempotente (upsert) y NO borra nada.
//    A diferencia de prisma/seed.ts, aquí NO se limpia la DB, así
//    que es seguro correrlo contra producción (Neon) con usuarios
//    y pruebas reales.
//
// Uso (el shell del sandbox exporta DATABASE_URL=SQLite que anula
// el .env, por eso se pasa explícito):
//   DATABASE_URL="postgresql://..." bun scripts/add-licobars.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Convierte un nombre a slug URL-friendly (misma lógica que seed.ts). */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Los 7 licobars ───────────────────────────────────────────

interface LicobarSeed {
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  instagram: string;
  priceRange: string;
  avgRating: number;
  reviewCount: number;
  schedule: string;
  specialty: string;
  valueProposition: string;
  promo: { title: string; description: string; discount: string; code: string };
  reviews: { userIndex: number; rating: number; comment: string }[];
}

const LICOBAR_PLACEHOLDER = '/images/licobar.png';
const GALLERY = [
  LICOBAR_PLACEHOLDER,
  '/images/gallery1.png',
  '/images/offer1.png',
  '/images/hero.png',
];

const LICOBARS: LicobarSeed[] = [
  {
    name: 'Licobar El Tequeño',
    description:
      'El licobar clásico del centro de Los Teques: mesas en la acera, música llanera y criolla en el parlante y la cerveza siempre al pistón. Pide tus picadas, saca una silla y quédate toda la tarde — aquí nadie corre a nadie.',
    address: 'Calle Rojas con Av. Bolívar, Centro, Los Teques',
    lat: 10.3468, lng: -67.0412,
    phone: '+584245550101',
    instagram: 'https://instagram.com/licobartequeno',
    priceRange: '$',
    avgRating: 4.4, reviewCount: 18,
    schedule: '10:00 AM - 11:00 PM (Lun-Sáb)',
    specialty: 'Cerveza al Pistón & Picadas',
    valueProposition:
      'La mesa de siempre donde la fría llega sola y el dominó es ley los sábados.',
    promo: {
      title: '2x1 en Nacionales de 4 a 8 PM',
      description: 'Todos los días de 4 a 8 PM: pides una fría y llegan dos. Solo en mesa.',
      discount: '2x1',
      code: 'TEQUENO2X1',
    },
    reviews: [
      { userIndex: 0, rating: 5, comment: 'El clásico del centro. Cerveza siempre al pistón y las picadas son enormes. El pancho te trata como de la casa.' },
      { userIndex: 1, rating: 4, comment: 'Buen ambiente para las tardes, mesas en la acera. Los sábados se llena temprano, lleguen con tiempo.' },
      { userIndex: 2, rating: 4, comment: 'Dominó, llanera y frías. Falta algo de sombra en la tarde pero vale la pena.' },
    ],
  },
  {
    name: 'Licobar El Barrilito',
    description:
      'Parrillera al fondo, mesas de dominó al frente y los neverones más famosos de La Matica. El punto de encuentro de los panas de siempre después del trabajo: aquí la charla empieza con la primera botella y termina cuando el ventilador se apaga.',
    address: 'Av. Periférico, La Matica, Los Teques',
    lat: 10.3389, lng: -67.0385,
    phone: '+584145550202',
    instagram: 'https://instagram.com/elbarriltolt',
    priceRange: '$',
    avgRating: 4.6, reviewCount: 24,
    schedule: '11:00 AM - 11:00 PM (Lun-Dom)',
    specialty: 'Parrilla & Dominó',
    valueProposition:
      'Los neverones más fríos de La Matica y una parrillera que no se apaga de jueves a domingo.',
    promo: {
      title: 'Caja de 24 + Picada del Barrilito',
      description: 'Caja de nacionales bien frías con la picada de la casa a precio de amigo.',
      discount: 'Combo',
      code: 'BARRILITO24',
    },
    reviews: [
      { userIndex: 3, rating: 5, comment: 'La carne asada con una fría de las de ellos no tiene precio. Atención rápida y ambiente familiar.' },
      { userIndex: 4, rating: 4, comment: 'Los neverones sí son otro nivel, cerveza congelada siempre. Recomendado para ir con el equipo.' },
      { userIndex: 5, rating: 5, comment: 'El mejor dominó de La Matica se juega aquí. Me siento en casa.' },
    ],
  },
  {
    name: 'Licobar Doña Rosa',
    description:
      'Patio familiar con techo de zinc, matas de mango y hamacas. La Doña te atiende personalmente y las cervezas salen del congelador al vaso. Los fines de semana hay asado a la leña y música criolla en vivo hasta el anochecer.',
    address: 'Sector El Cambre, Los Teques',
    lat: 10.3505, lng: -67.0463,
    phone: '+584125550303',
    instagram: 'https://instagram.com/licobardonarosa',
    priceRange: '$',
    avgRating: 4.7, reviewCount: 21,
    schedule: '12:00 PM - 10:00 PM (Vie-Dom)',
    specialty: 'Asado a la Leña & Criolla en Vivo',
    valueProposition:
      'El patio de la abuela con cerveza fría: hamacas, asado los fines de semana y la Doña preguntando si ya comiste.',
    promo: {
      title: 'Asado Familiar de Fin de Semana',
      description: 'Sábados y domingos: bandeja de asado con guarniciones para 4 personas.',
      discount: 'Familiar',
      code: 'DONAROSA4',
    },
    reviews: [
      { userIndex: 6, rating: 5, comment: 'Un oasis en El Cambre. Hamacas, criolla y la atención de la Doña Rosa que es un amor de persona.' },
      { userIndex: 7, rating: 5, comment: 'El asado del domingo aquí es tradición ya en nuestra familia. Lleguen temprano que vuela.' },
      { userIndex: 8, rating: 4, comment: 'Solo abre fines de semana pero vale la pena planear alrededor. Cerveza heladísima.' },
    ],
  },
  {
    name: 'Licobar La Terraza',
    description:
      'Terraza con vista a la ciudad, bombillos cálidos y ambiente relajado para conversar sin gritar. Carta de rones añejos y cervezas premium: el atardecer de Los Cerritos se disfruta mejor con una fría en la mano y la ciudad encendiéndose abajo.',
    address: 'Zona Los Cerritos, Los Teques',
    lat: 10.3397, lng: -67.0492,
    phone: '+584145550404',
    instagram: 'https://instagram.com/laterrazalt',
    priceRange: '$$',
    avgRating: 4.3, reviewCount: 15,
    schedule: '04:00 PM - 12:00 AM (Mar-Dom)',
    specialty: 'Rones Añejos & Atardeceres',
    valueProposition:
      'La mejor vista para un trago largo: terraza alta, rones añejos y el skyline de Los Teques al frente.',
    promo: {
      title: 'Hora Feliz del Atardecer',
      description: 'De 4 a 7 PM: cervezas premium y copas de ron con descuento especial.',
      discount: '20% OFF',
      code: 'TERRAZA17',
    },
    reviews: [
      { userIndex: 9, rating: 5, comment: 'El atardecer desde la terraza es espectacular. Ideal para conversar tranquilo, música a volumen justo.' },
      { userIndex: 10, rating: 4, comment: 'Buena selección de rones añejos. Un pelín más caro que otros licobares pero la vista lo justifica.' },
      { userIndex: 11, rating: 4, comment: 'Perfecto para una primera cita o una charla de esas largas. La subida es empinada, ojo con el parqueo.' },
    ],
  },
  {
    name: 'Licobar El Botellón',
    description:
      'Licobar musical con karaoké los viernes y difusor los sábados en la noche. Compra tu botella, pide la caja de frías o siéntate en las mesas altas del fondo: aquí la noche se alarga hasta que el cuerpo aguante. La Hoyada rumba siempre.',
    address: 'Av. Intercomunal, La Hoyada, Los Teques',
    lat: 10.3322, lng: -67.0313,
    phone: '+584125550505',
    instagram: 'https://instagram.com/elbotellonlt',
    priceRange: '$',
    avgRating: 4.2, reviewCount: 27,
    schedule: '04:00 PM - 02:00 AM (Jue-Dom)',
    specialty: 'Karaoké & Noches de Difusor',
    valueProposition:
      'El licobar que se convierte en rumba: karaoké los viernes, difusor los sábados y botellas a precio de nevera.',
    promo: {
      title: 'Caja de Frías + Entrada Sin Cover',
      description: 'Jueves y viernes: caja de 24 nacionales y acceso garantizado sin cover.',
      discount: 'Sin Cover',
      code: 'BOTELLON24',
    },
    reviews: [
      { userIndex: 12, rating: 5, comment: 'El karaoké de los viernes es un espectáculo, todos cantan aunque desafinen. Ambiente de pura cheveridad.' },
      { userIndex: 13, rating: 4, comment: 'Buenos precios en cajas y el difusor del sábado prende. Se llena después de las 10.' },
      { userIndex: 14, rating: 3, comment: 'La música está en todo el tope, cuesta conversar. Para rumba bien, para charlar mejor otro día.' },
    ],
  },
  {
    name: 'Licobar La Esquina del Frío',
    description:
      'La esquina de siempre en San José de Los Altos: neverones a reventar, mesa de futsin junto al mostrador y las mejores empanadas de la zona desde las 6 AM. Fría garantizada o te devuelves los billetes — es el lema y se cumple.',
    address: 'Calle Principal, San José de Los Altos, Los Teques',
    lat: 10.3562, lng: -67.0397,
    phone: '+584245550606',
    instagram: 'https://instagram.com/esquinadelfrio',
    priceRange: '$',
    avgRating: 4.5, reviewCount: 31,
    schedule: '06:00 AM - 09:00 PM (Lun-Dom)',
    specialty: 'Neverones a Reventar & Empanadas',
    valueProposition:
      'Abre desde las 6 AM: empanada caliente, fría a reventar y el futsin de la esquina como término medio.',
    promo: {
      title: 'Empanada + Fría del Desvelado',
      description: 'De 6 a 9 AM: empanada de su elección con cerveza bien fría a precio de amanecido.',
      discount: 'Combo',
      code: 'FRIO6AM',
    },
    reviews: [
      { userIndex: 15, rating: 5, comment: 'La empanada con fría de las 7 AM después de la noche larga no la cambia nadie. Leyenda del barrio.' },
      { userIndex: 0, rating: 4, comment: 'Siempre hay de todo y siempre está frío, cumplen el lema. El futsin es gratis y brutal.' },
      { userIndex: 1, rating: 5, comment: 'La esquina de San José por excelencia. Atención rápida y precios justos.' },
    ],
  },
  {
    name: 'Licobar Punto de Encuentro',
    description:
      'Frente al paradero de Guacara, el punto donde todos se encuentran antes de seguir la rumba. Mesas altas, música variada del pasado al presente y promociones de caja de cervezas todos los días. Si dijiste "nos vemos ahí", es aquí.',
    address: 'Sector Guacara, Los Teques',
    lat: 10.3413, lng: -67.0241,
    phone: '+584145550707',
    instagram: 'https://instagram.com/puntoencuentrolt',
    priceRange: '$',
    avgRating: 4.1, reviewCount: 14,
    schedule: '02:00 PM - 12:00 AM (Lun-Dom)',
    specialty: 'Cajas al Día & Mesas Altas',
    valueProposition:
      'El "nos vemos ahí" de Guacara: mesas altas frente al paradero y la caja de frías del día a precio de promo.',
    promo: {
      title: 'La Caja del Día',
      description: 'Todos los días: caja de 24 nacionales con precio especial hasta las 8 PM.',
      discount: 'Diaria',
      code: 'PUNTO24',
    },
    reviews: [
      { userIndex: 2, rating: 4, comment: 'Punto estratégico frente al paradero. Llegas y siempre hay alguien conocido tomando algo.' },
      { userIndex: 3, rating: 5, comment: 'Las promos de caja son buenas de verdad, no es truco. Música variada, pasan de salsa a Serrano.' },
      { userIndex: 4, rating: 3, comment: 'Cómodo para el pre-rumba aunque hace falta sombra en las mesas de afuera a las 2 PM.' },
    ],
  },
];

// ── Utilidades de horario (idéntico a seed.ts) ──────────────

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

const DAY_MAP: Record<string, number> = {
  dom: 0, lun: 1, mar: 2, mié: 3, mie: 3, jue: 4, vie: 5, sáb: 6, sab: 6,
};

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

function parseSchedule(
  schedule: string,
): { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }[] {
  const m = schedule.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))\s*\(([^)]+)\)/i,
  );
  if (!m) {
    return [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
      dayOfWeek: dow, openTime: '09:00', closeTime: '22:00', isClosed: false,
    }));
  }
  const openTime = parseTime12to24(m[1]!);
  const closeTime = parseTime12to24(m[2]!);
  const days = parseDayRange(m[3]!);
  return days.map((dow) => ({
    dayOfWeek: dow, openTime, closeTime, isClosed: false,
  }));
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('🍺 Añadiendo categoría "licobar" + 7 locales a Conecta-LT...\n');

  // 0. Pre-requisitos
  const admin = await prisma.user.findUnique({
    where: { email: 'sqn8nproyect@gmail.com' },
    select: { id: true },
  });
  if (!admin) throw new Error('No se encontró el usuario admin (sqn8nproyect@gmail.com)');

  const losTeques = await prisma.city.findFirst({
    where: { slug: 'los-teques' },
    select: { id: true },
  });
  if (!losTeques) throw new Error('No se encontró la ciudad Los Teques');

  const zonaCentro = await prisma.zone.findFirst({
    where: { cityId: losTeques.id, name: 'Centro' },
    select: { id: true },
  });
  if (!zonaCentro) throw new Error('No se encontró la zona Centro de Los Teques');

  // Usuarios de reviews del seed (u1…u16) — fallback: cualquier USER
  const reviewUsers = await prisma.user.findMany({
    where: { id: { startsWith: 'u' } },
    select: { id: true },
    orderBy: { id: 'asc' },
  });
  if (reviewUsers.length === 0) throw new Error('No hay usuarios seed para las reviews');

  // 1. Categoría licobar (upsert — idempotente)
  const category = await prisma.category.upsert({
    where: { slug: 'licobar' },
    update: { color: '#10B981', sortOrder: 3 },
    create: {
      name: 'licobar',
      slug: 'licobar',
      color: '#10B981', // esmeralda — cerveza fría, no choca con gold/amber/purple
      sortOrder: 3,
    },
  });
  console.log(`✓ Categoría "licobar" lista (id=${category.id})`);

  // 2. Los 7 locales (upsert por slug — nunca duplica ni pisa ediciones)
  let created = 0;
  let existing = 0;

  for (const l of LICOBARS) {
    const slug = slugify(l.name);

    const business = await prisma.business.upsert({
      where: { slug },
      update: {}, // ya existe → respetar cualquier edición de dueño/admin
      create: {
        name: l.name,
        slug,
        description: l.description,
        address: l.address,
        lat: l.lat,
        lng: l.lng,
        phone: l.phone,
        priceRange: l.priceRange,
        coverImage: LICOBAR_PLACEHOLDER,
        avgRating: l.avgRating,
        reviewCount: l.reviewCount,
        ambienteRating: Math.round(l.avgRating * 10) / 10,
        servicioRating: Math.round(l.avgRating * 10) / 10,
        precioCalidadRating: Math.round(l.avgRating * 10) / 10,
        specialty: l.specialty,
        valueProposition: l.valueProposition,
        status: 'ACTIVE',
        categoryId: category.id,
        cityId: losTeques.id,
        zoneId: zonaCentro.id,
        // Mismo patrón que el resto de locales gestionados:
        ownerId: admin.id,
        ownerStatus: 'APPROVED',
      },
    });

    // Señal de "recién creado": sin horarios = primero que entra
    // (los sub-registros solo se crean la primera vez).
    const isNew = (await prisma.businessHours.count({ where: { businessId: business.id } })) === 0;

    if (isNew) {
      // Horarios
      const hours = parseSchedule(l.schedule);
      await prisma.businessHours.createMany({
        data: hours.map((h) => ({ ...h, businessId: business.id })),
      });

      // Imágenes (cover + galería)
      await prisma.businessImage.createMany({
        data: [
          { url: LICOBAR_PLACEHOLDER, type: 'COVER', sortOrder: 0 },
          ...GALLERY.map((url, i) => ({ url, type: 'GALLERY' as const, sortOrder: i + 1 })),
        ].map((img) => ({ ...img, businessId: business.id })),
      });

      // Redes (Instagram + WhatsApp)
      await prisma.businessSocial.createMany({
        data: [
          { type: 'INSTAGRAM', value: l.instagram, sortOrder: 0 },
          { type: 'WHATSAPP', value: l.phone, sortOrder: 1 },
        ].map((s) => ({ ...s, businessId: business.id })),
      });

      // Promo activa (solo si no tiene ninguna)
      const promoCount = await prisma.promotion.count({ where: { businessId: business.id } });
      if (promoCount === 0) {
        await prisma.promotion.create({
          data: {
            businessId: business.id,
            title: l.promo.title,
            description: l.promo.description,
            discount: l.promo.discount,
            image: LICOBAR_PLACEHOLDER,
            code: l.promo.code,
            status: 'ACTIVE',
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            maxRedemptions: 50,
            redemptionCount: Math.floor(Math.random() * 8),
          },
        });
      }

      // Reviews de bienvenida (solo si no tiene ninguna)
      const reviewCount = await prisma.review.count({ where: { businessId: business.id } });
      if (reviewCount === 0) {
        for (const r of l.reviews) {
          const user = reviewUsers[r.userIndex % reviewUsers.length];
          if (!user) continue;
          await prisma.review.create({
            data: {
              businessId: business.id,
              userId: user.id,
              rating: r.rating,
              ambienteRating: r.rating,
              servicioRating: r.rating,
              precioCalidadRating: r.rating,
              comment: r.comment,
              status: 'PUBLISHED',
            },
          });
        }
      }

      created++;
      console.log(`  ✓ ${l.name} — creado (${l.reviews.length} reviews, 1 promo)`);
    } else {
      existing++;
      console.log(`  • ${l.name} — ya existía, sin cambios`);
    }
  }

  // 3. Resumen
  const licobarCount = await prisma.business.count({
    where: { categoryId: category.id },
  });
  console.log('\n═══════════════════════════════════════════');
  console.log(`  ✅ Listo: ${created} creados, ${existing} ya existían`);
  console.log(`  📊 Total licobares en DB: ${licobarCount}`);
  console.log('═══════════════════════════════════════════');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
