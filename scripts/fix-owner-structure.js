/**
 * Estructura de dueños: patrón de la plataforma = administrador dueño por
 * defecto (sqn8nproyect@gmail.com, igual que los otros 26 locales) para
 * todo venue sin dueño real. Los 2 reclamos legítimos (Licobar JJ →
 * cerotraba, San Pedro → ana.rodriguez) se respetan: NO se tocan.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ADMIN_ID = 'cmsnq9x850000kv04jj4wpxbe'; // sqn8nproyect@gmail.com (ADMIN) — patrón de los 26 existentes

async function main() {
  const huerfanos = await prisma.business.findMany({
    where: { ownerId: null },
    select: { id: true, name: true },
  });
  console.log('Sin owner:', huerfanos.map((b) => b.name).join(', ') || '(ninguno)');

  const res = await prisma.business.updateMany({
    where: { ownerId: null },
    data: { ownerId: ADMIN_ID, ownerStatus: 'APPROVED' },
  });
  console.log(`Asignados al admin por defecto: ${res.count}`);

  // Verificación final de la estructura completa
  const dist = await prisma.business.groupBy({
    by: ['ownerId', 'ownerStatus'],
    _count: true,
  });
  const admin = await prisma.user.findUnique({ where: { id: ADMIN_ID } });
  const owners = await prisma.user.findMany({
    where: { ownedBusinesses: { some: {} } },
    select: { id: true, email: true, role: true, _count: { select: { ownedBusinesses: true } } },
  });
  console.log('\nEstructura final de dueños:');
  for (const o of owners) {
    console.log(`  ${o.email.padEnd(30)} ${o.role.padEnd(15)} → ${o._count.ownedBusinesses} locales`);
  }
  const sinOwner = await prisma.business.count({ where: { ownerId: null } });
  console.log('Sin owner:', sinOwner);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
