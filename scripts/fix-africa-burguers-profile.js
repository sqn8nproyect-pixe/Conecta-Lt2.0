/**
 * Corrige la ficha de Africa Burguers (slug tasca-el-patio): su perfil
 * enriquecido completo estaba copiado de una licorería de rones —
 * descripción, specialty y valueProposition no correspondían a una
 * tasca de hamburguesas. Contenido genérico de categoría, sin datos
 * inventados, pendiente de verificación por el dueño.
 * Uso: unset DATABASE_URL DIRECT_URL; node scripts/fix-africa-burguers-profile.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FICHA = {
  description:
    'Hamburguesas preparadas al momento y ambiente casual de tasca para compartir en grupo. El plan ideal para cenar bien antes o durante la salida nocturna en Los Teques.',
  specialty: 'Hamburguesas artesanales',
  valueProposition:
    'Comida de calidad con porciones generosas y precios accesibles, en un ambiente relajado para ir con amigos.',
};

async function main() {
  const b = await prisma.business.findUnique({
    where: { slug: 'tasca-el-patio' },
    select: { id: true, name: true, description: true },
  });
  if (!b) throw new Error('No se encontró tasca-el-patio');

  console.log(`Antes (${b.name}):`);
  console.log(`  desc:  ${b.description}`);
  await prisma.business.update({
    where: { slug: 'tasca-el-patio' },
    data: FICHA,
  });
  console.log('Después:');
  console.log(`  desc:  ${FICHA.description}`);
  console.log(`  specialty: ${FICHA.specialty}`);
  console.log(`  valueProp: ${FICHA.valueProposition}`);
  console.log('✅ Ficha de Africa Burguers corregida');
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('🔴 ERROR:', e.message.slice(0, 300)); process.exit(1); })
  .finally(() => prisma.$disconnect());
