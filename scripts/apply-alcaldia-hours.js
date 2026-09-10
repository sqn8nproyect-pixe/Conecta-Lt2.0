/**
 * Aplica horarios oficiales de la Alcaldía de Los Teques (ordenanza de
 * expendio y consumo de alcohol) a los 28 locales del directorio.
 *
 * Mapeo por categoría:
 *  - licobar, tasca   → Bares/Tascas/Cantinas (consumo en sitio): Lun-Dom 11:00–01:00(+1)
 *  - discoteca        → Discotecas/Clubes Nocturnos:              Lun-Dom 19:00–03:00(+1)
 *  - licorería        → NO cubierta por la ordenanza (expendio al detal,
 *                       no consumo en sitio) → se conservan horarios actuales.
 *
 * Convención del schema: closeTime < openTime ⇒ cruza medianoche (+1).
 * Idempotente: borra y recrea los 7 días por local (transacción por negocio).
 *
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/apply-alcaldia-hours.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ── Horarios oficiales Alcaldía de Los Teques ──────────────────
const REGLAS = {
  licobar: { label: 'Bares/Tascas/Cantinas (consumo en sitio)', openTime: '11:00', closeTime: '01:00' },
  tasca: { label: 'Bares/Tascas/Cantinas (consumo en sitio)', openTime: '11:00', closeTime: '01:00' },
  discoteca: { label: 'Discotecas/Clubes Nocturnos', openTime: '19:00', closeTime: '03:00' },
  // licorería: ausente a propósito — no cubierta por la ordenanza pasada
};

const DIAS_SEMANA = [0, 1, 2, 3, 4, 5, 6]; // Lun a Domingo según ordenanza (0=Dom)

async function main() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      category: { select: { slug: true, name: true } },
      hours: { orderBy: { dayOfWeek: 'asc' } },
    },
    orderBy: [{ category: { slug: 'asc' } }, { name: 'asc' }],
  });

  let actualizados = 0;
  let omitidos = 0;

  for (const b of businesses) {
    const regla = REGLAS[b.category.slug];
    if (!regla) {
      omitidos++;
      console.log(`⏭️  [${b.category.name}] ${b.name} — categoría no cubierta por la ordenanza, sin cambios`);
      continue;
    }

    const before =
      b.hours.length === 0
        ? 'SIN_HORARIOS'
        : b.hours
            .map((h) => h.isClosed ? `${DIAS[h.dayOfWeek]}:cerrado` : `${DIAS[h.dayOfWeek]}:${h.openTime}-${h.closeTime}`)
            .join(' ');

    await prisma.$transaction(async (tx) => {
      await tx.businessHours.deleteMany({ where: { businessId: b.id } });
      await tx.businessHours.createMany({
        data: DIAS_SEMANA.map((day) => ({
          businessId: b.id,
          dayOfWeek: day,
          openTime: regla.openTime,
          closeTime: regla.closeTime,
          isClosed: false,
        })),
      });
    });
    actualizados++;

    console.log(
      `✅ [${b.category.name}] ${b.name}\n   antes: ${before}\n   ahora: ${regla.label} → Lun-Dom ${regla.openTime}-${regla.closeTime}(+1)`
    );
  }

  console.log(`\n── Resumen: ${actualizados} locales actualizados, ${omitidos} omitidos (sin regla) ──`);

  // Verificación: contar locales con días cerrados o sin horarios restantes
  const conCerrados = await prisma.businessHours.groupBy({
    by: ['businessId'],
    where: { isClosed: true },
    _count: true,
  });
  const total = await prisma.business.count();
  console.log(`Verificación: ${total} locales en total, ${conCerrados.length} con algún día cerrado (esperado: solo licorerías como Don Sancho)`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('🔴 ERROR:', e.message.slice(0, 300));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
