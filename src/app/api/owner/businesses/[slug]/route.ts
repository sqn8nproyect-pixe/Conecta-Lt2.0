// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — /api/owner/businesses/[slug] (Etapa 7.C.2)
//   GET  → returns the business with ALL fields (including hours,
//          socials, owner info) for the owner dashboard.
//   PATCH → updates basic info (name, description, address, phone,
//           priceRange, coverImage, specialty, valueProposition).
//
// Both handlers require `requireRole('BUSINESS_OWNER', 'ADMIN')`
// AND verify the user owns the business (or is ADMIN) via
// `assertBusinessOwnership` — defense-in-depth.
//
// Returns:
//   200 OwnerBusiness (GET) — full transformed business + hours +
//        socials + owner info, so the dashboard can render every
//        editable field in a single round-trip.
//   200 { id, slug, name } (PATCH) — minimal response so the client
//        can confirm the write + invalidate the right queries.
//   400 — invalid body / validation error
//   401 — no session
//   403 — not the owner (and not ADMIN)
//   404 — business not found
//   500 — unexpected server error
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { Prisma, UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import {
  businessInclude,
} from '@/server/repositories/business.repository';
import {
  transformBusiness,
  updateBusinessInfo,
  assertBusinessOwnership,
  type BusinessWithRelations,
} from '@/server/services/business.service';

// Extended include — `businessInclude` doesn't bring the owner
// relation. We layer it on top so the owner dashboard can show the
// owner's name + email (for the header) without a second fetch.
const ownerBusinessInclude = {
  ...businessInclude,
  owner: { select: { id: true, name: true, email: true } },
} satisfies Prisma.BusinessInclude;

type OwnerBusinessRow = BusinessWithRelations & {
  owner: { id: string; name: string | null; email: string } | null;
};

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

    // Verify ownership (throws 404/403 Response on failure).
    await assertBusinessOwnership(user.id, slug);

    const business = (await db.business.findUnique({
      where: { slug },
      include: ownerBusinessInclude,
    })) as OwnerBusinessRow | null;

    if (!business) {
      // Race: business was deleted between the ownership check and
      // this fetch. Treat it as a 404.
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 },
      );
    }

    // Run the public transformer for the base Establishment shape,
    // then layer on the raw `hours` / `socials` / `owner` arrays the
    // dashboard's edit forms need (the transformer collapses them
    // into derived fields like `schedule` / `instagram` / etc., but
    // the owner dashboard needs the raw rows too).
    const base = transformBusiness(business);
    return NextResponse.json({
      ...base,
      hours: business.hours.map((h) => ({
        id: h.id,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
      socials: business.socials.map((s) => ({
        id: s.id,
        type: s.type,
        value: s.value,
      })),
      owner: business.owner,
    });
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404
    console.error('GET /api/owner/businesses/[slug] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;

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

    // Build the partial data object — only the keys the owner is
    // allowed to edit. Unknown keys are silently dropped (defense-
    // in-depth against accidental writes to e.g. `avgRating`).
    const data: {
      name?: string;
      description?: string;
      address?: string;
      phone?: string | null;
      priceRange?: string;
      coverImage?: string | null;
      specialty?: string | null;
      valueProposition?: string | null;
    } = {};

    if (typeof b.name === 'string') data.name = b.name;
    if (typeof b.description === 'string') data.description = b.description;
    if (typeof b.address === 'string') data.address = b.address;
    if (typeof b.phone === 'string' || b.phone === null) {
      data.phone = b.phone;
    }
    if (typeof b.priceRange === 'string') data.priceRange = b.priceRange;
    if (typeof b.coverImage === 'string' || b.coverImage === null) {
      data.coverImage = b.coverImage;
    }
    if (typeof b.specialty === 'string' || b.specialty === null) {
      data.specialty = b.specialty;
    }
    if (
      typeof b.valueProposition === 'string' ||
      b.valueProposition === null
    ) {
      data.valueProposition = b.valueProposition;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 },
      );
    }

    const result = await updateBusinessInfo(user.id, slug, data);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Response) return e; // 401 / 403 / 404 / 400
    console.error('PATCH /api/owner/businesses/[slug] error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
