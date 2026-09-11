// Instrumentación de Next (register corre ANTES de servir la primera
// petición, en runtime Node). Aplica auto-migraciones idempotentes —
// ver src/server/db-bootstrap.ts para el porqué.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { bootstrapDbMigrations } = await import('./server/db-bootstrap');
  await bootstrapDbMigrations();
}
