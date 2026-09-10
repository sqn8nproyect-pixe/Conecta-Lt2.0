/**
 * Auditoría de descripciones (pre-saneamiento): duplicados, longitud,
 * y estado de la ficha enriquecida (specialty/valueProposition).
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/audit-descriptions.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const businesses = await prisma.business.findMany({
    select: {
      id: true, name: true, slug: true, description: true,
      specialty: true, valueProposition: true,
      category: { select: { name: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
  });

  // Duplicados exactos
  const byDesc = {};
  for (const b of businesses) {
    const key = (b.description ?? '').trim();
    (byDesc[key] = byDesc[key] || []).push(b.name);
  }
  const dupes = Object.entries(byDesc).filter(([, names]) => names.length > 1);

  console.log(`Total: ${businesses.length} locales`);
  console.log(`Descripciones únicas: ${Object.keys(byDesc).length}`);
  console.log(`En grupos duplicados: ${businesses.length - dupes.reduce((a, [, n]) => a + n.length === 0 ? 0 : 0, 0) || dupes.reduce((a, [, n]) => a + n.length, 0)}`);
  console.log(`\n── Grupos de descripciones idénticas (${dupes.length}) ──`);
  for (const [desc, names] of dupes) {
    console.log(`  [${names.length} locales, ${desc.length} chars] ${names.join(', ')}`);
    console.log(`    "${desc.slice(0, 110)}${desc.length > 110 ? '…' : ''}"`);
  }

  // Longitudes
  const lens = businesses.map((b) => (b.description ?? '').length);
  const cortas = businesses.filter((b) => (b.description ?? '').length < 120);
  console.log(`\n── Longitud ──`);
  console.log(`  min: ${Math.min(...lens)}, max: ${Math.max(...lens)}, promedio: ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)}`);
  console.log(`  Descripciones cortas (<120 chars, pobre para SEO): ${cortas.length}`);
  for (const b of cortas.slice(0, 30)) {
    console.log(`    - ${b.name} (${b.category.name}): ${b.description?.length ?? 0} chars`);
  }

  // Ficha enriquecida
  const sinSpecialty = businesses.filter((b) => !b.specialty?.trim()).length;
  const sinValueProp = businesses.filter((b) => !b.valueProposition?.trim()).length;
  console.log(`\n── Ficha enriquecida ──`);
  console.log(`  Sin specialty: ${sinSpecialty}/${businesses.length}`);
  console.log(`  Sin valueProposition: ${sinValueProp}/${businesses.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('🔴 ERROR:', e.message.slice(0, 300)); process.exit(1); })
  .finally(() => prisma.$disconnect());
