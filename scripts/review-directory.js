/**
 * Revisión completa del directorio post-aplicación de venues reales.
 * Muestra: categoría, nombre, slug, zona, teléfono, IG, horario resumido, flags de pendientes.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CAT_LABEL = {
  licoreria: 'Licorería',
  licobar: 'Licobar',
  tasca: 'Tasca/Bar',
  discoteca: 'Discoteca',
};

// Horario por día → string compacto "Lun-Sáb 11:00-21:00, Dom cerrado"
function fmtHours(hours) {
  if (!hours.length) return '(sin horarios)';
  const D = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  // agrupar días consecutivos con mismo horario
  const groups = [];
  for (const h of sorted) {
    const sig = `${h.openTime}-${h.closeTime}${h.isClosed ? '(cerr)' : ''}`;
    const last = groups[groups.length - 1];
    if (last && last.sig === sig && h.dayOfWeek === last.endDay + 1) {
      last.endDay = h.dayOfWeek;
    } else {
      groups.push({ startDay: h.dayOfWeek, endDay: h.dayOfWeek, sig });
    }
  }
  return groups
    .map((g) => {
      const dayLabel =
        g.startDay === g.endDay ? D[g.startDay] : `${D[g.startDay]}-${D[g.endDay]}`;
      if (g.sig.includes('(cerr)')) return `${dayLabel}: cerrado`;
      const [open, close] = g.sig.replace('(+1)', '').split('-');
      const cross = g.sig.includes('(+1)') ? '(+1)' : '';
      return `${dayLabel} ${open}-${close}${cross}`;
    })
    .join(' | ');
}

async function main() {
  const businesses = await prisma.business.findMany({
    orderBy: [{ name: 'asc' }],
    include: {
      category: true,
      hours: { orderBy: { dayOfWeek: 'asc' } },
      socials: true,
      _count: { select: { reviews: true, favorites: true, promotions: true } },
    },
  });

  console.log(`TOTAL: ${businesses.length} locales\n`);

  const byCat = {};
  for (const b of businesses) {
    (byCat[b.category.slug] = byCat[b.category.slug] || []).push(b);
  }

  for (const [cat, list] of Object.entries(byCat)) {
    console.log(`\n========== ${CAT_LABEL[cat] || cat} (${list.length}) ==========`);

    for (const b of list) {
      const ig = b.socials.filter((s) => s.type === 'INSTAGRAM').map((s) => s.value);
      const others = b.socials.filter((s) => s.type !== 'INSTAGRAM');
      const phone = b.phone || '—';
      const zone = b.zone || '—';
      const addr = (b.address || '').slice(0, 60);
      const flags = [];
      if (!b.latitude || !b.longitude) flags.push('sin GPS');
      if (!b.coverImage || b.coverImage.includes('placeholder')) flags.push('cover?');
      if (others.length) flags.push(`otros socials: ${others.length}`);
      if ((b.description || '').length < 120) flags.push('desc corta');

      console.log(`\n· ${b.name}  [${b.slug}]`);
      console.log(`  zona: ${zone} | tel: ${phone} | IG: ${ig.join(', ') || '—'}`);
      console.log(`  dir: ${addr}${b.address && b.address.length > 60 ? '…' : ''}`);
      console.log(`  hrs: ${fmtHours(b.hours)}`);
      console.log(
        `  reviews:${b._count.reviews} favs:${b._count.favorites} ofertas:${b._count.promotions}` +
          (flags.length ? `  ⚠ ${flags.join(', ')}` : '  ✓')
      );
    }
  }

  // Resumen de pendientes globales
  const noGps = businesses.filter((b) => !b.latitude || !b.longitude).length;
  const shortDesc = businesses.filter((b) => (b.description || '').length < 120).length;
  const withSocials = businesses.filter((b) => b.socials.length > 0).length;
  console.log(`\n\n===== RESUMEN =====`);
  console.log(`Sin GPS: ${noGps}/${businesses.length}`);
  console.log(`Descripción corta (<120): ${shortDesc}/${businesses.length}`);
  console.log(`Con socials: ${withSocials}/${businesses.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
