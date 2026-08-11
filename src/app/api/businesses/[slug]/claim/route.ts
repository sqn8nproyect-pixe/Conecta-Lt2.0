// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — POST /api/businesses/[slug]/claim
// Etapa 7.B — Business claim flow.
//
// A BUSINESS_OWNER (or ADMIN acting on their behalf) asserts that they
// own a business so they can manage its profile/promotions/capacity.
//
// Auth/role:
//   - 401 if no session
//   - 403 if role not in [BUSINESS_OWNER, ADMIN]
//
// Returns:
//   200 { id, name, ownerId, claimedAt }     — claim accepted
//   400 { error: 'Este local ya tiene un dueño gestionando' }
//   401 { error: 'No autenticado' }
//   403 { error: 'Acceso denegado' }
//   404 { error: 'Negocio no encontrado' }
//   500 { error: 'Error interno del servidor' }
//
// Side effect: inserts a SYSTEM notification for every ADMIN/MODERATOR
// user alerting them of the claim (best-effort — never blocks the
// response). For now the claim is immediate (no admin approval step);
// Etapa 7.C will add a revoke flow in the admin panel.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { claimBusiness } from '@/server/services/business.service';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    // Admins can also claim on behalf of someone — useful for the
    // admin panel (Etapa 7.C). In a future iteration we can add an
    // optional `onBehalfOf` body field; for now, the caller's own id
    // becomes the ownerId.
    const user = await requireRole(
      'BUSINESS_OWNER' as UserRole,
      'ADMIN' as UserRole,
    );
    const { slug } = await params;
    const result = await claimBusiness(user.id, slug);
    return NextResponse.json(result);
  } catch (e) {
    // Service throws `Response` for 400/401/403/404 — propagate directly.
    if (e instanceof Response) return e;
    console.error('POST /api/businesses/[slug]/claim error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
