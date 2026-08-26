// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/admin/businesses/proposals/[id]/review
//
// Admin reviews (approve/reject) a business proposal.
// Body: { action: 'approve' | 'reject' }
//
// On approve: applies the proposal data to the business based on field:
//   INFO           → update name, description, phone, specialty,
//                     valueProposition, priceRange
//   HOURS          → delete existing BusinessHours, create new ones
//   SOCIALS        → delete existing BusinessSocial, create new ones
//   PROMOTION      → update existing promotion fields
//   NEW_PROMOTION  → create new Promotion from data
//
// On reject: just marks the proposal as REJECTED.
// Notifies the proposer in both cases.
//
// BusinessProposal table is NOT in Prisma schema — all proposal
// operations use raw SQL. Business/Promotion/etc. are in schema
// and keep using Prisma.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole, SocialType } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

type ReviewAction = 'approve' | 'reject';

const VALID_ACTIONS: ReadonlySet<ReviewAction> = new Set([
  'approve',
  'reject',
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
  businessName: string | null;
  businessSlug: string | null;
  proposerName: string | null;
  proposerEmail: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireRole('ADMIN' as UserRole);
    const { id } = await params;

    let body: { action?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    if (!body.action || !VALID_ACTIONS.has(body.action as ReviewAction)) {
      return NextResponse.json(
        { error: 'action inválido (se esperaba approve | reject)' },
        { status: 400 },
      );
    }

    const action = body.action as ReviewAction;

    // Fetch the proposal with business name via raw SQL
    const rows = await db.$queryRawUnsafe<ProposalRow[]>(
      `SELECT bp.*,
              b."name" as "businessName", b."slug" as "businessSlug",
              u."name" as "proposerName", u."email" as "proposerEmail"
       FROM "BusinessProposal" bp
       JOIN "Business" b ON b."id" = bp."businessId"
       JOIN "User" u ON u."id" = bp."proposerId"
       WHERE bp."id" = $1`,
      id,
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Propuesta no encontrada' },
        { status: 404 },
      );
    }

    const proposal = rows[0]!;

    if (proposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Esta propuesta ya fue revisada' },
        { status: 400 },
      );
    }

    // Apply changes on approve
    if (action === 'approve') {
      const data = JSON.parse(proposal.data);

      switch (proposal.field) {
        case 'INFO': {
          const { name, description, phone, specialty, valueProposition, priceRange } = data;
          await db.business.update({
            where: { id: proposal.businessId },
            data: {
              ...(name && { name }),
              ...(description !== undefined && { description }),
              ...(phone !== undefined && { phone }),
              ...(specialty !== undefined && { specialty }),
              ...(valueProposition !== undefined && { valueProposition }),
              ...(priceRange && { priceRange }),
            },
          });
          break;
        }

        case 'HOURS': {
          // Delete existing hours, create new ones
          await db.businessHours.deleteMany({
            where: { businessId: proposal.businessId },
          });

          const hours: Array<{
            dayOfWeek: number;
            openTime: string;
            closeTime: string;
            isClosed?: boolean;
          }> = Array.isArray(data) ? data : data.hours;

          if (Array.isArray(hours)) {
            await db.businessHours.createMany({
              data: hours.map((h) => ({
                businessId: proposal.businessId,
                dayOfWeek: h.dayOfWeek,
                openTime: h.openTime,
                closeTime: h.closeTime,
                isClosed: h.isClosed ?? false,
              })),
            });
          }
          break;
        }

        case 'SOCIALS': {
          // Delete existing socials, create new ones
          await db.businessSocial.deleteMany({
            where: { businessId: proposal.businessId },
          });

          const socials: Array<{
            type: SocialType;
            value: string;
            sortOrder?: number;
          }> = Array.isArray(data) ? data : data.socials;

          if (Array.isArray(socials)) {
            await db.businessSocial.createMany({
              data: socials.map((s) => ({
                businessId: proposal.businessId,
                type: s.type,
                value: s.value,
                sortOrder: s.sortOrder ?? 0,
              })),
            });
          }
          break;
        }

        case 'PROMOTION': {
          const { promotionId, ...updateData } = data;
          if (promotionId) {
            await db.promotion.update({
              where: { id: promotionId },
              data: updateData,
            });
          }
          break;
        }

        case 'NEW_PROMOTION': {
          const { businessId: _bId, ...promotionData } = data;
          await db.promotion.create({
            data: {
              ...promotionData,
              businessId: proposal.businessId,
            },
          });
          break;
        }
      }

      // Notify proposer (best-effort)
      await notificationService.notify(
        proposal.proposerId,
        'SYSTEM',
        'Propuesta aprobada',
        `Tu propuesta para ${proposal.businessName ?? 'el negocio'} fue aprobada`,
      );
    } else {
      // Reject
      await notificationService.notify(
        proposal.proposerId,
        'SYSTEM',
        'Propuesta rechazada',
        `Tu propuesta para ${proposal.businessName ?? 'el negocio'} fue rechazada`,
      );
    }

    // Update proposal status via raw SQL
    const updatedRows = await db.$queryRawUnsafe<ProposalRow[]>(
      `UPDATE "BusinessProposal" SET "status" = $1, "reviewedBy" = $2, "reviewedAt" = NOW() WHERE "id" = $3 RETURNING *`,
      action === 'approve' ? 'APPROVED' : 'REJECTED',
      user.id,
      id,
    );

    return NextResponse.json(updatedRows[0]);
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(
      'POST /api/admin/businesses/proposals/[id]/review error:',
      e,
    );
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
