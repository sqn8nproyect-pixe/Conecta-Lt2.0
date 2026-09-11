// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — db-bootstrap (Sprint 8.9)
//
// Auto-migraciones idempotentes al arranque del servidor.
//
// ¿Por qué existe? El sandbox de desarrollo no tiene acceso a
// Neon (el .env local quedó con la línea SQLite tras el restore
// del snapshot) y Vercel no ejecuta `prisma migrate deploy` en
// el build. Este módulo aplica el DDL pendiente UNA vez por
// proceso cuando el servidor arranca (Next 15+/16 invoca
// register() de src/instrumentation.ts antes de servir tráfico),
// así el deploy queda auto-migrado sin pasos manuales del dueño.
//
// Garantías:
//  - Cada script es IDEMPOTENTE (IF NOT EXISTS en todo) → puede
//    correr N veces / en N lambdas sin efecto colateral.
//  - `migrate deploy` futuro lo re-ejecutaría sin daño (no-ops).
//  - Un fallo NO tumba el servidor: se loguea y continúa.
// ─────────────────────────────────────────────────────────────

type BootstrapMigration = {
  id: string;
  /** Debe ser idempotente — corre una vez por cold start. */
  statements: string[];
};

const MIGRATIONS: BootstrapMigration[] = [
  {
    id: '20260912000000_event_submission',
    statements: [
      "ALTER TYPE \"BusinessEventStatus\" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW'",
      "ALTER TYPE \"BusinessEventStatus\" ADD VALUE IF NOT EXISTS 'REJECTED'",
      'ALTER TABLE "BusinessEvent" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT',
    ],
  },
];

let ran: Promise<void> | null = null;

async function runMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL ?? '';
  // Solo Postgres gestionado (Neon en producción). En el sandbox el
  // .env apunta a SQLite/file: → no hay nada que auto-migrar aquí.
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.log(
      '[db-bootstrap] DATABASE_URL no es Postgres — se omite el bootstrap.',
    );
    return;
  }

  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  try {
    for (const migration of MIGRATIONS) {
      for (const stmt of migration.statements) {
        try {
          await db.$executeRawUnsafe(stmt);
        } catch (err) {
          // 42701 columna duplicada, 42710 objeto duplicado, 42P16…:
          // si otro lambda lo aplicó a la vez, seguir sin drama.
          console.error(
            `[db-bootstrap] ${migration.id} — statement falló (se continúa):`,
            err instanceof Error ? err.message.split('\n')[0] : err,
          );
        }
      }
    }
    console.log('[db-bootstrap] bootstrap completado.');
  } finally {
    await db.$disconnect().catch(() => undefined);
  }
}

/** Ejecuta el bootstrap una sola vez por proceso (memoizado). */
export function bootstrapDbMigrations(): Promise<void> {
  ran ??= runMigrations();
  return ran;
}
