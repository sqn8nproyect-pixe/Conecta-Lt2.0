// ─────────────────────────────────────────────────────────────
// CONECTA-LT — POST /api/admin/migrate-db
//
// One-time auto-migration: adds owner management columns to Business
// and creates the BusinessProposal table using raw SQL.
// Idempotent: safe to run multiple times (uses IF NOT EXISTS / DO $$).
// ADMIN only.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

const STEPS: { name: string; sql: string }[] = [
  {
    name: 'Enum OwnerApprovalStatus',
    sql: `DO $$ BEGIN CREATE TYPE "OwnerApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    name: 'Columna Business.ownerStatus',
    sql: `DO $$ BEGIN ALTER TABLE "Business" ADD COLUMN "ownerStatus" "OwnerApprovalStatus" NOT NULL DEFAULT 'APPROVED'; EXCEPTION WHEN duplicate_column THEN null; END $$;`,
  },
  {
    name: 'Columna Business.proposedOwnerId',
    sql: `DO $$ BEGIN ALTER TABLE "Business" ADD COLUMN "proposedOwnerId" TEXT; EXCEPTION WHEN duplicate_column THEN null; END $$;`,
  },
  {
    name: 'FK Business.proposedOwnerId',
    sql: `DO $$ BEGIN ALTER TABLE "Business" ADD CONSTRAINT "Business_proppposedOwnerId_fkey" FOREIGN KEY ("proposedOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    name: 'Enum ProposalStatus',
    sql: `DO $$ BEGIN CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    name: 'Enum ProposalField',
    sql: `DO $$ BEGIN CREATE TYPE "ProposalField" AS ENUM ('INFO', 'HOURS', 'SOCIALS', 'PROMOTION', 'NEW_PROMOTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    name: 'Tabla BusinessProposal',
    sql: `CREATE TABLE IF NOT EXISTS "BusinessProposal" (
      "id" TEXT NOT NULL,
      "businessId" TEXT NOT NULL,
      "proposerId" TEXT NOT NULL,
      "field" "ProposalField" NOT NULL,
      "data" TEXT NOT NULL,
      "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "BusinessProposal_pkey" PRIMARY KEY ("id")
    );`,
  },
  {
    name: 'FK BusinessProposal.businessId',
    sql: `DO $$ BEGIN ALTER TABLE "BusinessProposal" ADD CONSTRAINT "BusinessProposal_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    name: 'FK BusinessProposal.proposerId',
    sql: `DO $$ BEGIN ALTER TABLE "BusinessProposal" ADD CONSTRAINT "BusinessProposal_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  },
  {
    name: 'Índice businessId+status',
    sql: `CREATE INDEX IF NOT EXISTS "BusinessProposal_businessId_status_idx" ON "BusinessProposal"("businessId", "status");`,
  },
  {
    name: 'Índice proposerId+status',
    sql: `CREATE INDEX IF NOT EXISTS "BusinessProposal_proposerId_status_idx" ON "BusinessProposal"("proposerId", "status");`,
  },
];

export async function POST() {
  try {
    await requireRole('ADMIN' as UserRole);

    const results: { step: string; ok: boolean; detail?: string }[] = [];

    for (const { name, sql } of STEPS) {
      try {
        await db.$executeRawUnsafe(sql);
        results.push({ step: name, ok: true });
      } catch (e: unknown) {
        results.push({
          step: name,
          ok: false,
          detail: (e as Error).message.slice(0, 120),
        });
      }
    }

    const failed = results.filter((r) => !r.ok);
    return NextResponse.json({
      success: failed.length === 0,
      total: results.length,
      failed: failed.length,
      steps: results,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('POST /api/admin/migrate-db error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
