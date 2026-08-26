// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/proposals/[id]
//
// PUT    — Update a PENDING proposal's data.
//          Only the proposer can edit, only if status is PENDING.
//
// DELETE — Cancel a PENDING proposal.
//          Only the proposer can delete, only if status is PENDING.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

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

    // Fetch proposal and verify ownership
    const proposal = await db.businessProposal.findUnique({
      where: { id },
      select: {
        id: true,
        proposerId: true,
        status: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Propuesta no encontrada' },
        { status: 404 },
      );
    }

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

    const updated = await db.businessProposal.update({
      where: { id },
      data: {
        data: JSON.stringify(body.data),
      },
    });

    return NextResponse.json(updated);
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

    // Fetch proposal and verify ownership
    const proposal = await db.businessProposal.findUnique({
      where: { id },
      select: {
        id: true,
        proposerId: true,
        status: true,
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'Propuesta no encontrada' },
        { status: 404 },
      );
    }

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

    await db.businessProposal.delete({ where: { id } });

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
