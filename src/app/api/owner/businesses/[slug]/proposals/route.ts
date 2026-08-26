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
//
// BusinessProposal table is NOT in Prisma schema — all proposal
// operations use raw SQL.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { randomUUID } from 'crypto';

// ProposalField enum is no longer in Prisma schema — define locally
type ProposalField = 'INFO' | 'HOURS' | 'SOCIALS' | 'PROMOTION' | 'NEW_PROMOTION';

const VALID_FIELDS: ReadonlySet<ProposalField> = new Set([
  'INFO',
  'HOURS',
  'SOCIALS',
  'PROMOTION',
  'NEW_PROMOTION',
]);

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
}

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

    // Query proposals via raw SQL
    const proposals = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT * FROM "BusinessProposal"
       WHERE "businessId" = $1 AND "proposerId" = $2
       ORDER BY "createdAt" DESC`,
      business.id,
      user.id,
    );

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

    // Verify business and ownership (Prisma — ownerId is in schema)
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

    // Check for existing PENDING proposal on same business+field (raw SQL)
    const existing = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT "id" FROM "BusinessProposal"
       WHERE "businessId" = $1 AND "field" = $2 AND "status" = 'PENDING'
       LIMIT 1`,
      business.id,
      field,
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Ya existe una propuesta pendiente para este campo' },
        { status: 409 },
      );
    }

    // Create the proposal via raw SQL
    const proposalId = randomUUID();
    const now = new Date();
    await db.$executeRawUnsafe(
      `INSERT INTO "BusinessProposal" ("id", "businessId", "proposerId", "field", "data", "status", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)`,
      proposalId,
      business.id,
      user.id,
      field,
      JSON.stringify(body.data),
      now,
      now,
    );

    // Fetch the created proposal to return
    const created = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT * FROM "BusinessProposal" WHERE "id" = $1`,
      proposalId,
    );

    return NextResponse.json(created[0], { status: 201 });
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
