// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — GET /api/admin/stats (Etapa 7.C.1)
//
// Dashboard overview stats — a single object with:
//   - totals:   aggregate counts across every model.
//   - pending:  counts of items awaiting moderator action
//               (PENDING_REVIEW businesses, PENDING/FLAGGED reviews,
//               DRAFT/PAUSED promotions).
//   - recent:   last 5 reservations, last 5 reviews, last 5 business
//               claims (within 30 days).
//   - topThisWeek: top 5 businesses by BUSINESS_VIEW in the last 7
//                  days (reuses analyticsService.getPopularThisWeek).
//
// Auth: ADMIN or MODERATOR (requireRole).
//
// All counts run sequentially — for the scale of CONECTA-LT (21
// businesses, 86 reviews, 20 users) this is fast enough that wrapping
// in `db.$transaction` would add no benefit.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { analyticsService } from '@/server/services/analytics.service';
import type { AdminStats } from '@/lib/types';

export async function GET() {
  try {
    await requireRole('ADMIN' as UserRole, 'MODERATOR' as UserRole);

    // ── 1. Totals — single row counts across every table ──────────
    const [
      businesses,
      users,
      reviews,
      reservations,
      promotions,
      couponRedemptions,
      analyticsEvents,
      notifications,
    ] = await Promise.all([
      db.business.count(),
      db.user.count(),
      db.review.count(),
      db.reservation.count(),
      db.promotion.count(),
      db.couponRedemption.count(),
      db.analyticsEvent.count(),
      db.notification.count(),
    ]);

    // ── 2. Pending queues ─────────────────────────────────────────
    //   - businesses: status = PENDING_REVIEW (awaiting approval)
    //   - reviews:    status in (PENDING, FLAGGED)
    //   - promotions: status in (DRAFT, PAUSED) — not live, may need
    //                 moderator attention (the panel de dueño 7.C.2
    //                 will let owners toggle these; here we just count).
    const [pendingBusinesses, pendingReviews, pendingPromotions] =
      await Promise.all([
        db.business.count({ where: { status: 'PENDING_REVIEW' } }),
        db.review.count({
          where: { status: { in: ['PENDING', 'FLAGGED'] } },
        }),
        db.promotion.count({
          where: { status: { in: ['DRAFT', 'PAUSED'] } },
        }),
      ]);

    // ── 3. Recent activity ────────────────────────────────────────
    //   - last 5 reservations (any status) with business + user
    //   - last 5 reviews (any status) with business + user
    //   - last 5 business claims in the last 30 days (ownerId set,
    //     claimedAt within 30d), with owner info

    const [recentReservationsRows, recentReviewsRows, recentClaimsRows] =
      await Promise.all([
        db.reservation.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            confirmationCode: true,
            createdAt: true,
            business: { select: { name: true, slug: true } },
            user: { select: { name: true, email: true } },
          },
        }),
        db.review.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            business: { select: { name: true, slug: true } },
            user: { select: { name: true } },
          },
        }),
        db.business.findMany({
          take: 5,
          orderBy: { claimedAt: 'desc' },
          where: {
            ownerId: { not: null },
            claimedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            claimedAt: true,
            owner: { select: { name: true, email: true } },
          },
        }),
      ]);

    const recentReservations = recentReservationsRows.map((r) => ({
      id: r.id,
      confirmationCode: r.confirmationCode,
      createdAt: r.createdAt.toISOString(),
      business: r.business,
      user: r.user,
    }));

    const recentReviews = recentReviewsRows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
      business: r.business,
      user: { name: r.user?.name ?? null },
    }));

    const recentClaims = recentClaimsRows
      .filter((b) => b.owner !== null && b.claimedAt !== null)
      .map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        claimedAt: (b.claimedAt as Date).toISOString(),
        owner: {
          name: b.owner!.name,
          email: b.owner!.email,
        },
      }));

    // ── 4. Top this week (BUSINESS_VIEW in last 7 days, top 5) ─────
    // Reuse analyticsService.getPopularThisWeek(5) — it returns the
    // full transformed Establishment, but for the dashboard we only
    // need { name, slug, views } so we project it down.
    const popular = await analyticsService.getPopularThisWeek(5);
    const topThisWeek = {
      businesses: popular.map((p) => ({
        name: p.business.name,
        slug: p.business.slug,
        views: p.viewCount,
      })),
    };

    const payload: AdminStats = {
      totals: {
        businesses,
        users,
        reviews,
        reservations,
        promotions,
        couponRedemptions,
        analyticsEvents,
        notifications,
      },
      pending: {
        businesses: pendingBusinesses,
        reviews: pendingReviews,
        promotions: pendingPromotions,
      },
      recent: {
        reservations: recentReservations,
        reviews: recentReviews,
        claims: recentClaims,
      },
      topThisWeek,
    };

    return NextResponse.json(payload);
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('GET /api/admin/stats error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
