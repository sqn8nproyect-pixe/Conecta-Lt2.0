-- Sprint 8.9 — Flujo dueño→admin para flyers (BusinessEvent)
--
-- Los dueños proponen flyers desde su panel: nacen PENDING_REVIEW.
-- El admin los aprueba (PUBLISHED / DRAFT) o los rechaza (REJECTED)
-- con una nota visible para el dueño (reviewNote).
--
-- SQL IDEMPOTENTE a propósito: además del CLI de Prisma, este DDL se
-- auto-aplica al arranque del servidor vía src/instrumentation.ts
-- (el sandbox de desarrollo no tiene acceso a Neon; Vercel sí).
-- Si `migrate deploy` lo re-ejecuta después, ambas variantes son
-- no-ops seguras.

ALTER TYPE "BusinessEventStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';

ALTER TYPE "BusinessEventStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "BusinessEvent" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
