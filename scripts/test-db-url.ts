// Test discreto de la DATABASE_URL del historial git (PROTOCOL.md v1).
// NO imprime la URL ni credenciales — solo el resultado de conexión.
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const md = execSync('git show 477aa73:PROTOCOL.md', { encoding: 'utf8' });
const m = md.match(/postgresql:\/\/[^\s"'`]+/);
if (!m) {
  console.log('NO_URL');
  process.exit(1);
}
const url = m[0];

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

try {
  await prisma.$queryRaw`SELECT 1`;
  const n = await prisma.business.count();
  const active = await prisma.business.count({ where: { status: 'ACTIVE' } });
  console.log(`CONECTA ✓ · negocios: ${n} · activos: ${active}`);
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  // Redacta credenciales antes de imprimir cualquier diagnóstico
  const safe = msg.replace(/:[^:@/]+@/, ':[REDACTADO]@').replace(/postgresql:\/\/\S+/g, 'postgresql://[REDACTADO]');
  console.log('FALLA ✗ ·', safe.split('\n').slice(0, 3).join(' | ').slice(0, 300));
} finally {
  await prisma.$disconnect();
}
