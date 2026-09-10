/**
 * Aplica horarios oficiales de la Alcaldía de Los Teques (ordenanza de
 * expendio y consumo de alcohol) a los 28 locales del directorio. v2.
 *
 * Mapeo por categoría:
 *  - licobar   → Licobares (cierre mayor):              Lun-Dom 11:00–00:00 (medianoche)
 *  - tasca     → Bares/Tascas/Cantinas (consumo sitio): Lun-Dom 11:00–01:00(+1)
 *  - discoteca → Discotecas/Clubes Nocturnos:           Lun-Dom 19:00–03:00(+1)
 *  - licoreria → Expendio en envase cerrado:            Lun-Sáb 11:00–21:00, domingo cerrado
 *
 * NOTA TÉCNICA: el cierre de licobar a medianoche se guarda como '23:59'
 * (no '00:00') porque la lógica isOpenAt() interpreta closeTime < openTime
 * como cruce de medianoche — '00:00' dejaría el local "abierto para siempre"
 * desde las 11:00. '23:59' usa la rama normal y renderiza "11:59 PM".
 *
 * Convención del schema: closeTime < openTime ⇒ cruza medianoche (+1).
 * Idempotente: borra y recrea los 7 días por local (transacción por negocio).
 *
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/apply-alcaldia-hours.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ── Horarios oficiales Alcaldía de Los Teques (v2) ─────────────
// closedDays: días isClosed=true (0=Dom, 6=Sáb)
const REGLAS = {
  licobar: { label: 'Licobares (cierre mayor: medianoche)', openTime: '11:00', closeTime: '23:59', closedDays: [] },
  tasca: { label: 'Bares/Tascas/Cantinas (consumo en sitio)', openTime: '11:00', closeTime: '01:00', closedDays: [] },
  discoteca: { label: 'Discotecas/Clubes Nocturnos', openTime: '19:00', closeTime: '03:00', closedDays: [] },
  licoreria: { label: 'Licorerías (envase cerrado)', openTime: '11:00', closeTime: '21:00', closedDays: [0] },
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
          isClosed: regla.closedDays.includes(day),
        })),
      });
    });
    actualizados++;

    const aplica =
      regla.closedDays.length > 0
        ? `Lun-Sáb ${regla.openTime}-${regla.closeTime}, dom cerrado`
        : `Lun-Dom ${regla.openTime}-${regla.closeTime}${regla.closeTime < regla.openTime ? '(+1)' : ''}`;
    console.log(
      `✅ [${b.category.name}] ${b.name}\n   antes: ${before}\n   ahora: ${regla.label} → ${aplica}`
    );
  }

  console.log(`\n── Resumen: ${actualizados} locales actualizados, ${omitidos} omitidos (sin regla) ──`);

  // Verificación: días cerrados esperados = 7 licorerías × domingo
  const cerrados = await prisma.businessHours.findMany({
    where: { isClosed: true },
    select: { businessId: true, dayOfWeek: true },
  });
  const total = await prisma.business.count();
  console.log(
    `Verificación: ${total} locales, ${cerrados.length} registros cerrados (esperado: 7 = domingos de licorerías)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('🔴 ERROR:', e.message.slice(0, 300));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
