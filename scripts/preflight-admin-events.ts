// Chequeo rápido: usuario admin + conteo de eventos (Sprint 8.6 E2E preflight)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: 'sqn8nproyect@gmail.com' },
    select: { email: true, role: true },
  });
  console.log('admin:', admin ? `${admin.email} role=${admin.role}` : 'NO EXISTE');
  const evCount = await prisma.businessEvent.count();
  console.log('eventos en DB:', evCount);
  const businessSample = await prisma.business.findMany({
    select: { id: true, name: true },
    take: 3,
    orderBy: { name: 'asc' },
  });
  console.log('locales ejemplo:', businessSample.map((b) => b.name).join(' | '));
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
