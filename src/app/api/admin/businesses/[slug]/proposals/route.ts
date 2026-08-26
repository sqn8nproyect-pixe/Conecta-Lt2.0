// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/businesses/[slug]/proposals
//
// Return all proposals for a business, ordered by createdAt desc.
// Includes proposer name and email. Uses raw SQL (BusinessProposal
// table not in Prisma schema).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

interface ProposalRow {
  id: string;
  businessId: string;
  proposerId: string;
  field: string;
  data: string;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  proposerName: string | null;
  proposerEmail: string | null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);
    const { slug } = await params;

    // Verify business exists (Prisma — only reads id which is in schema)
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    // Query BusinessProposal via raw SQL
    const proposals = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT bp.*, u."name" as "proposerName", u."email" as "proposerEmail"
       FROM "BusinessProposal" bp
       JOIN "User" u ON u."id" = bp."proposerId"
       WHERE bp."businessId" = (SELECT "id" FROM "Business" WHERE "slug" = $1)
       ORDER BY bp."createdAt" DESC`,
      slug,
    );

    return NextResponse.json(proposals);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('GET /api/admin/businesses/[slug]/proposals error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
