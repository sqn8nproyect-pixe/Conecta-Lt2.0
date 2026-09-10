/**
 * Auditoría de horarios actuales por local (pre-saneamiento Alcaldía).
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/audit-business-hours.js
 * Descarga los BusinessHours de todos los negocios y los imprime
 * en formato tabla + JSON (para mapear contra horarios oficiales).
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function fmtDay(h) {
  if (!h) return '—';
  if (h.isClosed) return `${DIAS[h.dayOfWeek]}:cerrado`;
  // marca cruce de medianoche cuando closeTime < openTime
  const cross = h.closeTime < h.openTime ? ' (+1)' : '';
  return `${DIAS[h.dayOfWeek]}:${h.openTime}-${h.closeTime}${cross}`;
}

async function main() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      category: { select: { name: true, slug: true } },
      hours: { orderBy: { dayOfWeek: 'asc' } },
    },
    orderBy: [{ category: { slug: 'asc' } }, { name: 'asc' }],
  });

  console.log(`Total negocios: ${businesses.length}\n`);

  const report = [];
  for (const b of businesses) {
    const hoursStr =
      b.hours.length === 0 ? 'SIN_HORARIOS' : b.hours.map(fmtDay).join(' | ');
    const daysWithHours = b.hours.filter((h) => !h.isClosed).length;
    report.push({
      slug: b.slug,
      name: b.name,
      category: b.category.name,
      status: b.status,
      diasAbierto: daysWithHours,
      hours: b.hours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
    });
    console.log(
      `[${b.category.name}] ${b.name} (${b.slug}) — ${b.status} — ${daysWithHours}/7 días`
    );
    console.log(`   ${hoursStr}`);
  }

  // Resumen por categoría
  console.log('\n── Resumen por categoría ──');
  const byCat = {};
  for (const r of report) {
    byCat[r.category] = byCat[r.category] || { total: 0, sinHorarios: 0 };
    byCat[r.category].total++;
    if (r.diasAbierto === 0) byCat[r.category].sinHorarios++;
  }
  for (const [cat, v] of Object.entries(byCat)) {
    console.log(`   ${cat}: ${v.total} locales, ${v.sinHorarios} sin horarios`);
  }

  require('fs').writeFileSync(
    '/home/z/my-project/scripts/hours-audit.json',
    JSON.stringify(report, null, 2)
  );
  console.log('\nJSON completo → scripts/hours-audit.json');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('🔴 ERROR:', e.message.slice(0, 300));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
