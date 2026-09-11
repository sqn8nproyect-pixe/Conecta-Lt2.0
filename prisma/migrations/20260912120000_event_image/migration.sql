-- Sprint 8.10 — flyer personalizado: imagen opcional del evento.
-- AlterTable idempotente (coherente con src/server/db-bootstrap.ts,
-- que aplica el mismo DDL al arranque del server en Vercel).
ALTER TABLE "BusinessEvent" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "BusinessEvent" ADD COLUMN IF NOT EXISTS "imageKey" TEXT;
