#!/usr/bin/env bash
# fix-local-migrations.sh — desbloquea la cadena de migraciones en la PG
# embebida local: aplica el DDL de event_submission fuera de transacción
# (ALTER TYPE ADD VALUE no puede correr dentro de la tx de Prisma) y la
# marca como aplicada para que `migrate deploy` continúe con el resto.
# Correr DENTRO de preview-run.sh.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // El enum BusinessEventStatus NUNCA tuvo migración que lo cree (en
  // Neon lo creaba el auto-DDL de db-bootstrap al arranque). Crearlo
  // idempotentemente antes que event_submission:
  await c.query(`DO $$ BEGIN
    CREATE TYPE "BusinessEventStatus" AS ENUM ('DRAFT','PENDING_REVIEW','PUBLISHED','REJECTED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
  // DDL idempotente de event_submission, fuera de transacción:
  await c.query("ALTER TYPE \"BusinessEventStatus\" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW'");
  await c.query("ALTER TYPE \"BusinessEventStatus\" ADD VALUE IF NOT EXISTS 'REJECTED'");
  await c.query('ALTER TABLE "BusinessEvent" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT');
  console.log('DDL event_submission aplicado manualmente ✓');
  await c.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
EOF

bunx prisma migrate resolve --rolled-back 20260912000000_event_submission 2>&1 | tail -1
echo "migración marcada como rolled-back (se marcará aplicada al re-deploy)" || true

# Marcar como aplicada SIN re-ejecutarla (el DDL ya está aplicado arriba)
node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(
    `UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1
     WHERE migration_name = '20260912000000_event_submission' AND finished_at IS NULL`
  );
  console.log('event_submission marcada aplicada ✓');
  await c.end();
})().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
EOF

echo "=== migrate deploy (cadena completa) ==="
bunx prisma migrate deploy 2>&1 | tail -8
