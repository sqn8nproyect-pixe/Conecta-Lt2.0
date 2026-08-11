// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PATCH /api/owner/businesses/[slug]/promotions/[id]
// (Etapa 7.C.2)
//
// Update promotion fields AND/OR change status. Body is a partial:
//   {
//     title?: string,
//     description?: string,
//     price?: string,
//     discount?: string,
//     image?: string,
//     code?: string,
//     startDate?: string (ISO),
//     endDate?: string (ISO),
//     maxRedemptions?: number | null,
//     status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED'
//   }
//
// Status transitions allowed (owner-side):
//   DRAFT  → ACTIVE   (publish)
//   ACTIVE → PAUSED   (pause)
//   PAUSED → ACTIVE   (resume)
//
// Owner CANNOT set EXPIRED — that's automatic based on endDate
// (the public `isPromotionLive()` helper treats past-endDate promos
// as expired; we don't auto-flip the column to EXPIRED to keep the
// data model simple — the column stays as whatever the owner set,
// and `isPromotionLive()` is the source of truth at read time).
//
// Returns `{ id, status }` on success.
//
// Auth: BUSINESS_OWNER or ADMIN + ownership check on the BUSINESS.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, PromotionStatus, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  assertBusinessOwnership,
} from '@/server/services/business.service';
import type { PromotionStatus as FrontendPromotionStatus } from '@/lib/types';

const VALID_STATUSES: ReadonlySet<FrontendPromotionStatus> = new Set([
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
]);

// Allowed forward transitions for the `status` field. The owner can
// only move within the {DRAFT, ACTIVE, PAUSED} triangle — EXPIRED is
// automatic (driven by endDate at read time via isPromotionLive()).
const ALLOWED_STATUS_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  DRAFT: new Set(['ACTIVE']),
  ACTIVE: new Set(['PAUSED']),
  PAUSED: new Set(['ACTIVE']),
  EXPIRED: new Set(), // terminal — owner can't change an expired promo
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug, id } = await params;

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

    // Fetch the promotion — must belong to the owned business.
    const promotion = await db.promotion.findUnique({
      where: { id },
      select: { id: true, businessId: true, status: true },
    });
    if (!promotion || promotion.businessId !== biz.id) {
      return NextResponse.json(
        { error: 'Promoción no encontrada' },
        { status: 404 },
      );
    }

    // ── Validate status transition (if status is being changed) ──
    let newStatus: FrontendPromotionStatus | undefined;
    if (b.status !== undefined) {
      if (typeof b.status !== 'string') {
        return NextResponse.json(
          { error: 'status debe ser un string' },
          { status: 400 },
        );
      }
      if (!VALID_STATUSES.has(b.status as FrontendPromotionStatus)) {
        return NextResponse.json(
          {
            error:
              'status inválido (se esperaba DRAFT | ACTIVE | PAUSED | EXPIRED)',
          },
          { status: 400 },
        );
      }
      newStatus = b.status as FrontendPromotionStatus;

      // Owner can't set EXPIRED — that's automatic.
      if (newStatus === 'EXPIRED') {
        return NextResponse.json(
          {
            error:
              'No puedes marcar una promoción como EXPIRED manualmente. El estado se calcula automáticamente según la fecha de fin.',
          },
          { status: 400 },
        );
      }

      // Validate the transition against the current status.
      const allowed =
        ALLOWED_STATUS_TRANSITIONS[promotion.status] ?? new Set();
      if (!allowed.has(newStatus)) {
        return NextResponse.json(
          {
            error: `Transición inválida: ${promotion.status} → ${newStatus}`,
          },
          { status: 400 },
        );
      }
    }

    // ── Build the update payload ────────────────────────────────
    const data: Prisma.PromotionUpdateInput = {};
    if (typeof b.title === 'string' && b.title.trim().length > 0) {
      data.title = b.title.trim();
    }
    if (typeof b.description === 'string' && b.description.trim().length > 0) {
      data.description = b.description.trim();
    }
    if (typeof b.price === 'string') {
      data.price = b.price.trim().length > 0 ? b.price.trim() : null;
    }
    if (typeof b.discount === 'string') {
      data.discount = b.discount.trim().length > 0 ? b.discount.trim() : null;
    }
    if (typeof b.image === 'string') {
      data.image = b.image.trim().length > 0 ? b.image.trim() : null;
    }
    if (typeof b.code === 'string' && b.code.trim().length > 0) {
      data.code = b.code.trim().toUpperCase();
    }
    if (typeof b.startDate === 'string') {
      if (b.startDate.trim().length === 0) {
        data.startDate = null;
      } else {
        const d = new Date(b.startDate);
        if (!Number.isNaN(d.getTime())) data.startDate = d;
      }
    }
    if (typeof b.endDate === 'string') {
      if (b.endDate.trim().length === 0) {
        data.endDate = null;
      } else {
        const d = new Date(b.endDate);
        if (!Number.isNaN(d.getTime())) data.endDate = d;
      }
    }
    if (b.maxRedemptions !== undefined) {
      if (b.maxRedemptions === null) {
        data.maxRedemptions = null;
      } else if (
        typeof b.maxRedemptions === 'number' &&
        Number.isInteger(b.maxRedemptions) &&
        b.maxRedemptions > 0
      ) {
        data.maxRedemptions = b.maxRedemptions;
      } else {
        return NextResponse.json(
          { error: 'maxRedemptions debe ser un entero positivo o null' },
          { status: 400 },
        );
      }
    }
    if (newStatus !== undefined) {
      data.status = newStatus as PromotionStatus;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 },
      );
    }

    // `code` is @unique — wrap in try/catch so a duplicate code
    // surfaces as a clean 400 instead of a 500.
    let updated;
    try {
      updated = await db.promotion.update({
        where: { id: promotion.id },
        data,
        select: { id: true, status: true },
      });
    } catch (e) {
      if (
        (e as { code?: string }).code === 'P2002'
      ) {
        return NextResponse.json(
          { error: 'El código de promoción ya está en uso. Elige otro.' },
          { status: 400 },
        );
      }
      throw e;
    }

    return NextResponse.json({
      id: updated.id,
      status: updated.status as FrontendPromotionStatus,
    });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('PATCH /api/owner/businesses/[slug]/promotions/[id] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
