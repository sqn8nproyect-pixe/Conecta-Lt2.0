// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/proposals/[id]
//
// PUT    — Update a PENDING proposal's data.
//          Only the proposer can edit, only if status is PENDING.
//
// DELETE — Cancel a PENDING proposal.
//          Only the proposer can delete, only if status is PENDING.
//
// BusinessProposal table is NOT in Prisma schema — all proposal
// operations use raw SQL.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

interface ProposalRow {
  id: string;
  proposerId: string;
  status: string;
  data: string;
  businessId: string;
  field: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { id } = await params;

    // Fetch proposal and verify ownership (raw SQL)
    const rows = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT * FROM "BusinessProposal" WHERE "id" = $1`,
      id,
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Propuesta no encontrada' },
        { status: 404 },
      );
    }

    const proposal = rows[0]!;

    if (proposal.proposerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo el autor puede editar esta propuesta' },
        { status: 403 },
      );
    }

    if (proposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden editar propuestas pendientes' },
        { status: 400 },
      );
    }

    let body: { data?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    if (body.data === undefined || body.data === null) {
      return NextResponse.json(
        { error: 'data es requerido' },
        { status: 400 },
      );
    }

    // Update via raw SQL, return updated row
    const updated = await db.$queryRawUnsafe<ProposalRow[]>(
      `UPDATE "BusinessProposal" SET "data" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *`,
      JSON.stringify(body.data),
      id,
    );

    return NextResponse.json(updated[0]);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('PUT /api/owner/businesses/proposals/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { id } = await params;

    // Fetch proposal and verify ownership (raw SQL)
    const rows = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT * FROM "BusinessProposal" WHERE "id" = $1`,
      id,
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Propuesta no encontrada' },
        { status: 404 },
      );
    }

    const proposal = rows[0]!;

    if (proposal.proposerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo el autor puede cancelar esta propuesta' },
        { status: 403 },
      );
    }

    if (proposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden cancelar propuestas pendientes' },
        { status: 400 },
      );
    }

    // Delete via raw SQL
    await db.$executeRawUnsafe(
      `DELETE FROM "BusinessProposal" WHERE "id" = $1`,
      id,
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error('DELETE /api/owner/businesses/proposals/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
