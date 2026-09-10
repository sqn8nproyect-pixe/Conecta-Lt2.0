// ─────────────────────────────────────────────────────────────
// Conecta-LT 3.0 — Seed de eventos del fin de semana (Sprint 8.7)
// Crea los 12 eventos que se renderizan como flyers en la
// portada /editorial. Fin de semana del 11 al 13 de septiembre
// de 2026 (vie/sáb/dom), en locales reales del directorio.
//
// 7 de los 12 anclan promociones vigentes publicadas por los
// dueños en CONECTA-LT (códigos reales de la tabla Promotion):
//   TERRAZA17 · BOTELLON24 · TEQUENO2X1 · BARRILITO24 ·
//   DONAROSA4 · FRIO6AM · PUNTO24 (este último en el artículo).
// Los 5 restantes son la agenda de rumba típica de las
// discotecas y tascas del directorio (sin precios inventados).
//
// Los *Label van pre-renderizados en español (America/Caracas,
// UTC-4) para que el flyer nunca muestre una hora desfasada.
//
// Ejecutar: unset DATABASE_URL DIRECT_URL; bun prisma/seed-weekend-events.ts
// Idempotente: local + título + weekOf → update o create.
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// Carpeta horaria de Venezuela: UTC-4 todo el año.
const VE = '-04:00';

/** "2026-09-11T21:00" (hora local VE) → Date UTC equivalente. */
function ve(datetimeLocal: string): Date {
  return new Date(`${datetimeLocal}${VE}`);
}

const WEEK_OF = new Date('2026-09-12T00:00:00Z'); // sábado de la semana cubierta

type EventSeed = {
  business: string; // nombre exacto en DB
  title: string;
  tagline: string;
  emoji: string;
  theme: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
  startsAt: Date;
  priceNote?: string;
  promoNote?: string;
  sortOrder: number;
};

const EVENTS: EventSeed[] = [
  // ── VIERNES 11 ───────────────────────────────────────────
  {
    business: 'Bodegón Bicentenario',
    title: 'Hora Feliz del Atardecer',
    tagline: '20% de descuento mientras cae el sol',
    emoji: '🌅',
    theme: 'orange',
    dayLabel: 'VIERNES',
    dateLabel: '11 SEP',
    timeLabel: '5:00 PM',
    startsAt: ve('2026-09-11T17:00'),
    promoNote: '20% OFF · código TERRAZA17',
    sortOrder: 1,
  },
  {
    business: 'Club Centro de Amigos',
    title: 'Viernes de Rumba Criolla',
    tagline: 'Salsa, merengue y clásicos pa\u2019 bailar',
    emoji: '🎺',
    theme: 'red',
    dayLabel: 'VIERNES',
    dateLabel: '11 SEP',
    timeLabel: '9:00 PM',
    startsAt: ve('2026-09-11T21:00'),
    sortOrder: 2,
  },
  {
    business: 'Café Racer Bar',
    title: 'Botellón de los Moteros',
    tagline: 'La previa del fin de semana en San Antonio',
    emoji: '🍻',
    theme: 'gold',
    dayLabel: 'VIERNES',
    dateLabel: '11 SEP',
    timeLabel: '8:00 PM',
    startsAt: ve('2026-09-11T20:00'),
    promoNote: 'Sin cover · código BOTELLON24',
    sortOrder: 3,
  },
  {
    business: 'Discoteca Medusa',
    title: 'Opening: Sesión de DJ',
    tagline: 'Electrónica en la Panamericana hasta las 3:00 AM',
    emoji: '🎧',
    theme: 'purple',
    dayLabel: 'VIERNES',
    dateLabel: '11 SEP',
    timeLabel: '10:00 PM',
    startsAt: ve('2026-09-11T22:00'),
    sortOrder: 4,
  },

  // ── SÁBADO 12 ────────────────────────────────────────────
  {
    business: 'Mercaplus La Fortaleza',
    title: 'La Hora del Sol',
    tagline: 'Nacionales al precio de una mientras cae la tarde',
    emoji: '🍹',
    theme: 'sky',
    dayLabel: 'SÁBADO',
    dateLabel: '12 SEP',
    timeLabel: '4:00 PM',
    startsAt: ve('2026-09-12T16:00'),
    promoNote: '2x1 de 4 a 8 PM · TEQUENO2X1',
    sortOrder: 5,
  },
  {
    business: 'Bodegón El Toro',
    title: 'La Picada del Barrilito',
    tagline: 'Caja de 24 frías + picada pa\u2019 la previa',
    emoji: '🍖',
    theme: 'amber',
    dayLabel: 'SÁBADO',
    dateLabel: '12 SEP',
    timeLabel: '6:00 PM',
    startsAt: ve('2026-09-12T18:00'),
    promoNote: 'Combo · código BARRILITO24',
    sortOrder: 6,
  },
  {
    business: 'New Copacabana',
    title: 'Sábado de Vieja Escuela',
    tagline: 'Reggaetón y salsa de los 90 y 2000',
    emoji: '🎤',
    theme: 'pink',
    dayLabel: 'SÁBADO',
    dateLabel: '12 SEP',
    timeLabel: '10:00 PM',
    startsAt: ve('2026-09-12T22:00'),
    sortOrder: 7,
  },
  {
    business: 'Disco El Emperador',
    title: 'Noche de Mix en Vivo',
    tagline: 'DJ invitado, láser y sonido en Carrizal',
    emoji: '🪩',
    theme: 'teal',
    dayLabel: 'SÁBADO',
    dateLabel: '12 SEP',
    timeLabel: '11:00 PM',
    startsAt: ve('2026-09-12T23:00'),
    sortOrder: 8,
  },

  // ── DOMINGO 13 ───────────────────────────────────────────
  {
    business: 'Jungla Bar',
    title: 'Asado Familiar',
    tagline: 'La parrilla de siempre, en la mesa de siempre',
    emoji: '🥩',
    theme: 'lime',
    dayLabel: 'DOMINGO',
    dateLabel: '13 SEP',
    timeLabel: '12:00 MD',
    startsAt: ve('2026-09-13T12:00'),
    promoNote: 'Asado · código DONAROSA4',
    sortOrder: 9,
  },
  {
    business: 'Africa Burguers',
    title: 'Domingo de Burgers',
    tagline: 'Las favoritas del centro con música todo el tardeo',
    emoji: '🍔',
    theme: 'crimson',
    dayLabel: 'DOMINGO',
    dateLabel: '13 SEP',
    timeLabel: '12:00 MD',
    startsAt: ve('2026-09-13T12:00'),
    sortOrder: 10,
  },
  {
    business: 'Scandalo Gastrobar',
    title: 'Tardeo de Karaoke',
    tagline: 'Toma el micrófono tú también en San Antonio',
    emoji: '🎙️',
    theme: 'violet',
    dayLabel: 'DOMINGO',
    dateLabel: '13 SEP',
    timeLabel: '6:00 PM',
    startsAt: ve('2026-09-13T18:00'),
    sortOrder: 11,
  },
  {
    business: 'La Estación de la Birra y el Licor',
    title: 'El Desvelado',
    tagline: 'Cierre del fin de semana: empanada + fría',
    emoji: '🌙',
    theme: 'blue',
    dayLabel: 'DOMINGO',
    dateLabel: '13 SEP',
    timeLabel: '11:00 PM',
    startsAt: ve('2026-09-13T23:00'),
    promoNote: 'Combo del desvelado · FRIO6AM',
    sortOrder: 12,
  },
];

async function main() {
  console.log('── Seed de eventos del fin de semana (Sprint 8.7)');

  let created = 0;
  let updated = 0;

  for (const ev of EVENTS) {
    const business = await db.business.findFirst({
      where: { name: ev.business, status: 'ACTIVE' },
      select: { id: true, slug: true },
    });

    if (!business) {
      console.warn(`⚠️  Local no encontrado o inactivo: "${ev.business}" — evento omitido`);
      continue;
    }

    const existing = await db.businessEvent.findFirst({
      where: {
        businessId: business.id,
        title: ev.title,
        weekOf: WEEK_OF,
      },
      select: { id: true },
    });

    const payload = {
      businessId: business.id,
      title: ev.title,
      tagline: ev.tagline,
      emoji: ev.emoji,
      theme: ev.theme,
      dayLabel: ev.dayLabel,
      dateLabel: ev.dateLabel,
      timeLabel: ev.timeLabel,
      startsAt: ev.startsAt,
      priceNote: ev.priceNote ?? null,
      promoNote: ev.promoNote ?? null,
      weekOf: WEEK_OF,
      sortOrder: ev.sortOrder,
      status: 'PUBLISHED' as const,
    };

    if (existing) {
      await db.businessEvent.update({ where: { id: existing.id }, data: payload });
      updated += 1;
    } else {
      await db.businessEvent.create({ data: payload });
      created += 1;
    }

    console.log(`✅ ${ev.dayLabel} ${ev.dateLabel} · ${ev.timeLabel} — ${ev.title} @ ${ev.business}`);
  }

  const total = await db.businessEvent.count({ where: { weekOf: WEEK_OF } });
  console.log(`\nResumen: ${created} creados, ${updated} actualizados, ${total} en la semana del 12-sep.`);

  if (total < 12) {
    console.warn(`⚠️  Se esperaban 12 eventos en la semana, hay ${total}.`);
  }
}

main()
  .catch((error) => {
    console.error('❌ Seed falló:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
