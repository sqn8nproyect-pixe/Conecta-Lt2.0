// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/businesses/[slug]/proposals
//
// Return all proposals for a business, ordered by createdAt desc.
// Includes proposer name and email.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);
    const { slug } = await params;

    // Verify business exists
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

    const proposals = await db.businessProposal.findMany({
      where: { businessId: business.id },
      include: {
        proposer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

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
