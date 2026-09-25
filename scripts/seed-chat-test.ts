// seed-chat-test.ts — usuarios de prueba para E2E del chat (solo PG local).
// Uso: bash scripts/preview-run.sh bun scripts/seed-chat-test.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const USERS = [
  { email: 'ana@test.local', name: 'Ana Prueba', image: null },
  { email: 'beto@test.local', name: 'Beto Prueba', image: null },
];

async function main() {
  for (const u of USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: { name: u.name },
      create: {
        email: u.email,
        name: u.name,
        image: u.image,
        role: 'USER',
        emailVerified: new Date(),
      },
    });
    console.log('Usuario listo:', user.id, user.email);
  }
  const total = await db.user.count();
  console.log('Total usuarios en PG local:', total);
}

main()
  .catch((e) => {
    console.error('SEED ERROR:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
