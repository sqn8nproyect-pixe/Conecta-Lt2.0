// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — PATCH /api/admin/users/[id]/role (Etapa 7.C.1)
//
// Change a user's role (USER / BUSINESS_OWNER / BUSINESS_MANAGER /
// MODERATOR / ADMIN). ADMIN-ONLY — a moderator cannot promote
// anyone (defensive: role changes are the most sensitive admin op).
//
// Body: { role: 'USER' | 'BUSINESS_OWNER' | 'BUSINESS_MANAGER' | 'MODERATOR' | 'ADMIN' }
//
// Defensive guards:
//   - 404 if the user doesn't exist
//   - 400 if the change would demote the last ADMIN (lockout guard)
//
// Side effect: notify the user — "Tu rol fue actualizado a X".
//
// NOTE ON ROLE FRESHNESS: the user's NEXT session will reflect the
// new role. The cached JWT (set by NextAuth's `jwt` callback in
// `src/lib/auth.ts`) is only refreshed on the next sign-in, so a
// user who is currently signed in will keep their old role until
// they sign out and back in. For CONECTA-LT's scale this is fine —
// role changes are rare and a re-login is acceptable. The comment
// in `src/server/auth.ts` documents this tradeoff in detail.
// ─────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { UserRole } from '@prisma/client';
import { requireRole } from '@/server/auth';
import { db } from '@/lib/db';
import { notificationService } from '@/server/services/notification.service';

const VALID_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'USER',
  'BUSINESS_OWNER',
  'BUSINESS_MANAGER',
  'MODERATOR',
  'ADMIN',
]);

const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'usuario',
  BUSINESS_OWNER: 'dueño de negocio',
  BUSINESS_MANAGER: 'gerente de negocio',
  MODERATOR: 'moderador',
  ADMIN: 'administrador',
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole('ADMIN' as UserRole);

    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido (se esperaba JSON)' },
        { status: 400 },
      );
    }

    const rawRole = (body as Record<string, unknown> | null)?.role;
    if (
      typeof rawRole !== 'string' ||
      !VALID_ROLES.has(rawRole as UserRole)
    ) {
      return NextResponse.json(
        {
          error:
            'role inválido (se esperaba USER | BUSINESS_OWNER | BUSINESS_MANAGER | MODERATOR | ADMIN)',
        },
        { status: 400 },
      );
    }
    const role = rawRole as UserRole;

    // 404 if the user doesn't exist.
    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true, email: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 },
      );
    }

    // ── Lockout guard: don't demote the last ADMIN ───────────────
    // If the change would take an ADMIN down to a non-admin role AND
    // there's only one ADMIN in the DB, refuse with 400. This prevents
    // a self-lockout footgun (the only admin demoting themselves and
    // losing the ability to ever sign in as admin again).
    if (
      existing.role === 'ADMIN' &&
      role !== 'ADMIN'
    ) {
      const adminCount = await db.user.count({
        where: { role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              'No puedes degradar al último administrador (evitar bloqueo del panel)',
          },
          { status: 400 },
        );
      }
    }

    const updated = await db.user.update({
      where: { id },
      data: { role },
      select: { id: true, role: true },
    });

    // ── Side effect: notify the user (best-effort) ───────────────
    try {
      await notificationService.notify(
        updated.id,
        'SYSTEM',
        'Tu rol fue actualizado',
        `Tu rol fue actualizado a ${ROLE_LABELS[updated.role]}.`,
      );
    } catch (e) {
      console.error('notify user of role change failed:', e);
    }

    return NextResponse.json({
      id: updated.id,
      role: updated.role,
    });
  } catch (e) {
    // 401 / 403 from requireRole() propagate directly.
    if (e instanceof Response) return e;
    console.error('PATCH /api/admin/users/[id]/role error:', e);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
