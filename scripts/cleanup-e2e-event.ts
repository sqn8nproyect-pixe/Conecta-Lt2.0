// Limpieza de seguridad: borra cualquier evento de prueba E2E que
// haya quedado en la DB (por si un paso visual falló a mitad).
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const leftovers = await prisma.businessEvent.findMany({
    where: {
      OR: [
        { title: { startsWith: 'Prueba Visual E2E' } },
        { title: { startsWith: 'TEST E2E' } },
      ],
    },
    select: { id: true, title: true },
  });
  for (const ev of leftovers) {
    await prisma.businessEvent.delete({ where: { id: ev.id } });
    console.log('eliminado leftover:', ev.title, ev.id);
  }
  if (leftovers.length === 0) console.log('sin leftovers — DB limpia ✅');
}

main()
  .catch((e) => {
    console.error('ERROR:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
