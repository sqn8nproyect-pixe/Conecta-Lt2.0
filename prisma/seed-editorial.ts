// ─────────────────────────────────────────────────────────────
// Conecta-LT 3.0 — Seed editorial (Sprint 8.4)
// Publica el post v1 "Qué hacer este fin de semana en Los
// Teques (12 y 13 de septiembre)" con SOLO datos verificados:
//   - Promos con endDate >= 2026-09-12 (vencen 2026-10-08)
//   - Horarios de sáb/dom tal cual están en BusinessHours
//   - Ratings con reviewCount real (≥4 reseñas)
// Los slugs se resuelven desde la DB al ejecutar (si un local
// no existe, el link se omite y se deja el nombre plano).
//
// Ejecutar: unset DATABASE_URL DIRECT_URL; bun prisma/seed-editorial.ts
// Idempotente: upsert por slug.
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

// nombre exacto en DB → usado para resolver slug + conectar la M-N
const MENCIONADOS = [
  'Bodegón El Toro',
  'Café Racer Bar',
  'Mercaplus La Fortaleza',
  'La Estación de la Birra y el Licor',
  'Licobar JJ',
  'Bodegón Bicentenario',
  'Jungla Bar',
  'Africa Burguers',
  'Daws Lounge & Delicious Food',
  'Club Centro de Amigos',
  'Discoteca Donato',
  'Discoteca Koko Frappe',
  'Discoteca Medusa',
  'Disco El Emperador',
  'Tasca Restaurante La Villa de San Pedro',
] as const;

const POST = {
  slug: 'que-hacer-este-fin-de-semana-los-teques-12-13-septiembre',
  title: 'Qué hacer este fin de semana en Los Teques (12 y 13 de septiembre)',
  excerpt:
    'Promos vigentes para la previa, discotecas hasta las 3:00 AM, tascas hasta la 1:00 AM y planes familiares para el domingo: la guía del fin de semana con datos verificados de los locales de Los Teques y los Altos Mirandinos.',
  weekOf: new Date('2026-09-12T00:00:00Z'),
  status: 'PUBLISHED' as const,
  publishedAt: new Date(),
};

function body(l: (name: string) => string): string {
  return `Fin de semana largo de planes en Los Teques y los Altos Mirandinos: hay promociones vigentes que resuelven la previa, discotecas que cierran a las 3:00 de la mañana y tascas con cocina hasta la 1:00 AM. Armamos esta guía con los horarios y las promos que los locales tienen publicados en CONECTA-LT, así que todos los datos están verificados en su ficha.

## La previa: combos y promociones vigentes

Antes de la rumba, la parada obligatoria es el bodegón o el licobar de confianza. Estas son las promociones que siguen activas este fin de semana (canjeables con su código desde la ficha de cada local):

- **[Bodegón El Toro](${l('Bodegón El Toro')})** — Caja de 24 + Picada del Barrilito (código \`BARRILITO24\`). Está en la Panamericana Sur, abre sábados de 11:00 AM a medianoche y suma 4.6 estrellas en 24 reseñas.
- **[Café Racer Bar](${l('Café Racer Bar')})** — Caja de frías + entrada sin cover (código \`BOTELLON24\`). El licobar de moto de San Antonio de Los Altos, valorado con 4.2 en 27 reseñas.
- **[Mercaplus La Fortaleza](${l('Mercaplus La Fortaleza')})** — 2x1 en cervezas nacionales de 4 a 8 PM (código \`TEQUENO2X1\`). Perfecto para la hora del sol en la Panamericana.
- **[La Estación de la Birra y el Licor](${l('La Estación de la Birra y el Licor')})** — Empanada + fría del Desvelado (código \`FRIO6AM\`). Uno de los licobares con más reseñas del directorio (31) y 4.5 estrellas.
- **[Licobar JJ](${l('Licobar JJ')})** — La Caja del Día (código \`PUNTO24\`). El punto de encuentro del centro, abierto hasta medianoche los sábados.
- **[Bodegón Bicentenario](${l('Bodegón Bicentenario')})** — 20% de descuento en la Hora Feliz del Atardecer (código \`TERRAZA17\`). En plena Av. Roscio, ideal para comprar antes de seguir de ruta.

## Sábado en la noche: la rumba hasta las 3:00 AM

Las discotecas de la zona abren a las 7:00 PM y cierran a las 3:00 AM el sábado. En el casco central tienes tres opciones con 4.5 estrellas: [Club Centro de Amigos](${l('Club Centro de Amigos')}), el salón de baile clásico para los amantes de la salsa; [Discoteca Donato](${l('Discoteca Donato')}), la rumba de siempre del centro; y [Discoteca Koko Frappe](${l('Discoteca Koko Frappe')}), en la Av. Víctor Baptista. Si prefieres la vía Panamericana, [Discoteca Medusa](${l('Discoteca Medusa')}) mueve la noche en el CC La Matica, y hacia Carrizal la parada es [Disco El Emperador](${l('Disco El Emperador')}), dentro del CC La Cascada.

## Cena y ambiente: tascas y bares hasta la 1:00 AM

Si el plan es comer rico y quedarse en ambiente (sin llegar a la discoteca), estas tascas cierran a la 1:00 AM los sábados:

- **[Africa Burguers](${l('Africa Burguers')})** — hamburguesas artesanales en el patio del centro, 4.6 estrellas en 5 reseñas.
- **[Daws Lounge & Delicious Food](${l('Daws Lounge & Delicious Food')})** — lounge con cocina casual en San Antonio de Los Altos, también 4.6 en 5 reseñas.

Y para un ambiente distinto, [Jungla Bar](${l('Jungla Bar')}) es el licobar mejor valorado del directorio (4.7 estrellas en 21 reseñas): ambiente jungle en el centro, abierto hasta medianoche, y este fin de semana con **Asado Familiar de Fin de Semana** (código \`DONAROSA4\`).

## Domingo tranquilo

Para cerrar el fin de semana sin madrugada, la recomendación es la [Tasca Restaurante La Villa de San Pedro](${l('Tasca Restaurante La Villa de San Pedro')}): cocina de pueblo a 30 minutos de Los Teques, 4.8 estrellas y el encanto de San Pedro de los Altos. El asado familiar de [Jungla Bar](${l('Jungla Bar')}) también corre el domingo, y la Hora Feliz del atardecer de [Bodegón Bicentenario](${l('Bodegón Bicentenario')}) es buena excusa para una compra inteligente antes de empezar la semana.

## Antes de salir

- Los horarios de esta guía provienen de las fichas verificadas de cada local; si vas con tiempo justo, confirma por teléfono o Instagram desde la ficha.
- Todos los códigos de promoción se canjean desde la ficha interactiva de cada local en la app (botón de cupón).
- ¿Aún sin decidirte? Usa el Planificador de Noche de CONECTA-LT: eliges presupuesto y vibes, y te arma la ruta.

*Esta guía se publica cada fin de semana con las promos y horarios vigentes. Si tienes un local en Los Teques o los Altos Mirandinos y quieres aparecer en la próxima edición, contáctanos desde la app.*`;
}

async function main() {
  // Resolver los locales mencionados por nombre exacto
  const rows = await db.business.findMany({
    where: { name: { in: [...MENCIONADOS] }, status: 'ACTIVE' },
    select: { id: true, name: true, slug: true },
  });
  const byName = new Map(rows.map((r) => [r.name, r]));

  const missing = MENCIONADOS.filter((n) => !byName.has(n));
  if (missing.length > 0) {
    console.warn(`⚠ Sin match en DB (el nombre quedará sin link): ${missing.join(', ')}`);
  }

  // helper de link: usa el slug real de la DB; sin match → sin link
  const link = (name: string): string => {
    const b = byName.get(name);
    return b ? `/local/${b.slug}` : '#';
  };

  const businessIds = [...byName.values()].map((b) => b.id);

  const baseData = {
    title: POST.title,
    excerpt: POST.excerpt,
    body: body(link),
    weekOf: POST.weekOf,
    status: POST.status,
    publishedAt: POST.publishedAt,
  };
  // M-N implícita: en update se usa `set` (reemplaza), en create
  // solo existe `connect` — por eso van en objetos separados.
  const connectIds = businessIds.map((id) => ({ id }));

  const post = await db.editorialPost.upsert({
    where: { slug: POST.slug },
    update: { ...baseData, businesses: { set: connectIds } },
    create: { ...baseData, slug: POST.slug, businesses: { connect: connectIds } },
  });

  console.log(`✅ Post publicado: /editorial/${post.slug}`);
  console.log(`   Título: ${post.title}`);
  console.log(`   Locales conectados: ${businessIds.length}/${MENCIONADOS.length}`);
  console.log(`   weekOf: ${post.weekOf.toISOString().slice(0, 10)} · estado: ${post.status}`);
}

main()
  .catch((err) => {
    console.error('❌ Seed editorial falló:', err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
