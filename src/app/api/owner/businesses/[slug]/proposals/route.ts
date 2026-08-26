// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/[slug]/proposals
//
// GET  — Return proposals for this business by the current user,
//        ordered by createdAt desc.
//
// POST — Create a new proposal for the business.
//        Body: { field: ProposalField, data: object }
//        Only allowed if:
//          - business.ownerId === user.id OR user is ADMIN
//          - no PENDING proposal exists for same business+field
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole, ProposalField } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';

const VALID_FIELDS: ReadonlySet<ProposalField> = new Set([
  'INFO',
  'HOURS',
  'SOCIALS',
  'PROMOTION',
  'NEW_PROMOTION',
]);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

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
      where: {
        businessId: business.id,
        proposerId: user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(proposals);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(
      'GET /api/owner/businesses/[slug]/proposals error:',
      e,
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

    let body: { field?: string; data?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    if (!body.field || !VALID_FIELDS.has(body.field as ProposalField)) {
      return NextResponse.json(
        {
          error:
            'field inválido (se esperaba INFO | HOURS | SOCIALS | PROMOTION | NEW_PROMOTION)',
        },
        { status: 400 },
      );
    }

    if (body.data === undefined || body.data === null) {
      return NextResponse.json(
        { error: 'data es requerido' },
        { status: 400 },
      );
    }

    const field = body.field as ProposalField;

    // Verify business and ownership
    const business = await db.business.findUnique({
      where: { slug },
      select: { id: true, ownerId: true },
    });

    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    if (business.ownerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo el dueño del negocio puede crear propuestas' },
        { status: 403 },
      );
    }

    // Check for existing PENDING proposal on same business+field
    const existing = await db.businessProposal.findFirst({
      where: {
        businessId: business.id,
        field,
        status: 'PENDING',
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una propuesta pendiente para este campo' },
        { status: 409 },
      );
    }

    // Create the proposal
    const proposal = await db.businessProposal.create({
      data: {
        businessId: business.id,
        proposerId: user.id,
        field,
        data: JSON.stringify(body.data),
      },
    });

    return NextResponse.json(proposal, { status: 201 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(
      'POST /api/owner/businesses/[slug]/proposals error:',
      e,
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
