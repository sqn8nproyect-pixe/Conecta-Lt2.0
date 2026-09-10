/**
 * Aplica el roster de venues reales (scripts/real-venues-roster.js) a la DB.
 *
 * - rename: actualiza un negocio existente (nombre, slug, categoría, dirección,
 *   coords aprox, teléfono, specialty, valueProp, descripción, horarios, IG).
 *   Conserva reviews/favoritos/ofertas/imagenes del slot.
 * - create: negocio nuevo (cityId heredado de un negocio existente de Los Teques).
 *
 * Guardas: aborta si un oldSlug es un keeper, si un oldSlug no existe,
 * si un nuevo slug ya está tomado, o si un IG es inválido.
 * Idempotente en datos (upserts), pero renames son one-shot (el oldSlug desaparece).
 *
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/apply-real-venues.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ROSTER = require('./real-venues-roster.js');

// Slots que el usuario mandó a conservar — NUNCA deben ser renombrados
const KEEP_SLUGS = ['licobar-punto-de-encuentro', 'licoreria-don-sancho', 'tasca-el-patio'];
const DIAS = [0, 1, 2, 3, 4, 5, 6];

async function setHours(businessId, hours) {
  await prisma.businessHours.deleteMany({ where: { businessId } });
  await prisma.businessHours.createMany({
    data: DIAS.map((day) => ({
      businessId,
      dayOfWeek: day,
      openTime: hours.open,
      closeTime: hours.close,
      isClosed: hours.closedDays.includes(day),
    })),
  });
}

async function setInstagram(businessId, handle) {
  await prisma.businessSocial.deleteMany({
    where: { businessId, type: 'INSTAGRAM' },
  });
  if (handle) {
    await prisma.businessSocial.create({
      data: { businessId, type: 'INSTAGRAM', value: `@${handle.replace(/^@/, '')}`, sortOrder: 0 },
    });
  }
}

async function main() {
  // ── Validaciones previas (todas antes de escribir) ──
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catBySlug = Object.fromEntries(cats.map((c) => [c.slug, c.id]));

  const errors = [];
  for (const r of ROSTER) {
    if (!catBySlug[r.cat]) errors.push(`categoría inexistente: ${r.cat} (${r.name})`);
    if (r.mode === 'rename' && KEEP_SLUGS.includes(r.oldSlug)) {
      errors.push(`oldSlug ${r.oldSlug} es un KEEP — no se puede renombrar`);
    }
  }
  const newSlugs = ROSTER.map((r) => r.slug);
  if (new Set(newSlugs).size !== newSlugs.length) errors.push('slugs duplicados en roster');
  const existing = await prisma.business.findMany({
    where: { slug: { in: [...new Set([...newSlugs, ...ROSTER.filter((r) => r.mode === 'rename').map((r) => r.oldSlug)])] } },
    select: { slug: true },
  });
  const existingSet = new Set(existing.map((b) => b.slug));
  for (const r of ROSTER) {
    if (r.mode === 'rename' && !existingSet.has(r.oldSlug)) errors.push(`oldSlug no existe: ${r.oldSlug}`);
    if (existingSet.has(r.slug)) errors.push(`nuevo slug ya tomado: ${r.slug}`);
  }
  if (errors.length) {
    console.error('🔴 Validación falló:\n' + errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
  console.log(`Validación OK: ${ROSTER.filter((r) => r.mode === 'rename').length} renames + ${ROSTER.filter((r) => r.mode === 'create').length} creates\n`);

  const anyBusiness = await prisma.business.findFirst({ select: { cityId: true } });
  const cityId = anyBusiness.cityId;

  // ── Ejecución ──
  for (const r of ROSTER) {
    const data = {
      name: r.name,
      slug: r.slug,
      description: r.description,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      phone: r.phone ?? null,
      specialty: r.specialty,
      valueProposition: r.valueProposition,
      categoryId: catBySlug[r.cat],
    };

    if (r.mode === 'rename') {
      const b = await prisma.business.update({ where: { slug: r.oldSlug }, data });
      await setHours(b.id, r.hours);
      await setInstagram(b.id, r.ig ?? null);
      console.log(`✏️  [${r.cat}] ${r.oldSlug} → ${r.name} (${r.slug})${r.source === 'usuario' ? ' ★ datos usuario' : ''}`);
    } else {
      const b = await prisma.business.create({ data: { ...data, cityId } });
      await setHours(b.id, r.hours);
      await setInstagram(b.id, r.ig ?? null);
      console.log(`➕ [${r.cat}] ${r.name} (${r.slug}) creado${r.source === 'usuario' ? ' ★ datos usuario' : ''}`);
    }
  }

  // ── Verificación final ──
  const groups = await prisma.business.groupBy({ by: ['categoryId'], _count: true });
  const catNames = await prisma.category.findMany({ select: { id: true, slug: true } });
  const total = await prisma.business.count();
  console.log(`\n── Total: ${total} locales ──`);
  for (const g of groups) {
    const slug = catNames.find((c) => c.id === g.categoryId)?.slug;
    console.log(`   ${slug}: ${g._count}`);
  }
  const hoursCount = await prisma.businessHours.count();
  console.log(`   BusinessHours rows: ${hoursCount} (esperado ${total * 7})`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('🔴 ERROR:', e.message.slice(0, 400)); process.exit(1); })
  .finally(() => prisma.$disconnect());
