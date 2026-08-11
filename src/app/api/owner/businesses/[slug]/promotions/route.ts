// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/[slug]/promotions (Etapa 7.C.2)
//   GET  → list ALL promotions for the business (all statuses, not
//          just ACTIVE). Requires ownership.
//   POST → create a new promotion. Body: { title, description, price?,
//          discount?, image?, code?, startDate?, endDate?, maxRedemptions? }.
//          Status starts as DRAFT — the owner can publish it via the
//          PATCH /api/owner/businesses/[slug]/promotions/[id] endpoint.
//
// Auth: BUSINESS_OWNER or ADMIN + ownership check (assertBusinessOwnership).
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, PromotionStatus, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';

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

    // Verify ownership — throws 404/403 Response on failure.
    const biz = await assertBusinessOwnership(user.id, slug);

    const promotions = await db.promotion.findMany({
      where: { businessId: biz.id },
      orderBy: { createdAt: 'desc' },
    });

    // Project to the OwnerPromotion shape the frontend expects.
    const result = promotions.map((p) => ({
      id: p.id,
      businessId: p.businessId,
      title: p.title,
      description: p.description,
      price: p.price ?? '',
      discount: p.discount ?? '',
      image: p.image ?? '',
      code: p.code ?? '',
      startDate: p.startDate?.toISOString() ?? null,
      endDate: p.endDate?.toISOString() ?? null,
      maxRedemptions: p.maxRedemptions,
      redemptionCount: p.redemptionCount,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error('GET /api/owner/businesses/[slug]/promotions error:', e);
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

    // Verify ownership — throws 404/403 Response on failure.
    const biz = await assertBusinessOwnership(user.id, slug);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const b = body as Record<string, unknown>;

    // Validate required fields.
    if (typeof b.title !== 'string' || b.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 },
      );
    }
    if (
      typeof b.description !== 'string' ||
      b.description.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 },
      );
    }

    // Build the create payload — only the keys the owner can set.
    // Status starts as DRAFT (owner publishes via PATCH).
    const data: Prisma.PromotionCreateInput = {
      business: { connect: { id: biz.id } },
      title: b.title.trim(),
      description: b.description.trim(),
      status: 'DRAFT' as PromotionStatus,
    };

    if (typeof b.price === 'string' && b.price.trim().length > 0) {
      data.price = b.price.trim();
    }
    if (typeof b.discount === 'string' && b.discount.trim().length > 0) {
      data.discount = b.discount.trim();
    }
    if (typeof b.image === 'string' && b.image.trim().length > 0) {
      data.image = b.image.trim();
    }
    if (typeof b.code === 'string' && b.code.trim().length > 0) {
      data.code = b.code.trim().toUpperCase();
    }
    if (typeof b.startDate === 'string' && b.startDate.trim().length > 0) {
      const d = new Date(b.startDate);
      if (!Number.isNaN(d.getTime())) data.startDate = d;
    }
    if (typeof b.endDate === 'string' && b.endDate.trim().length > 0) {
      const d = new Date(b.endDate);
      if (!Number.isNaN(d.getTime())) data.endDate = d;
    }
    if (
      typeof b.maxRedemptions === 'number' &&
      Number.isInteger(b.maxRedemptions) &&
      b.maxRedemptions > 0
    ) {
      data.maxRedemptions = b.maxRedemptions;
    }

    // `code` is @unique — wrap in try/catch so a duplicate code
    // surfaces as a clean 400 instead of a 500.
    let created;
    try {
      created = await db.promotion.create({ data });
    } catch (e) {
      if (
        e instanceof Error &&
        (e as { code?: string }).code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'El código de promoción ya está en uso. Elige otro.' },
          { status: 400 },
        );
      }
      throw e;
    }

    return NextResponse.json(
      {
        id: created.id,
        businessId: created.businessId,
        title: created.title,
        description: created.description,
        price: created.price ?? '',
        discount: created.discount ?? '',
        image: created.image ?? '',
        code: created.code ?? '',
        startDate: created.startDate?.toISOString() ?? null,
        endDate: created.endDate?.toISOString() ?? null,
        maxRedemptions: created.maxRedemptions,
        redemptionCount: created.redemptionCount,
        status: created.status,
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('POST /api/owner/businesses/[slug]/promotions error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
