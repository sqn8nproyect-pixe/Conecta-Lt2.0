// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Server-side session helpers
// Thin wrappers around getServerSession so API routes can:
//   - getCurrentUser()              → returns the user or null
//   - requireUser()                 → throws 401 if no session
//   - getCurrentUserWithRole()      → same as getCurrentUser but also
//                                     includes the user's UserRole
//                                     (Etapa 7.B — RBAC)
//   - requireRole(...allowedRoles)  → throws 401 if no session,
//                                     403 if role not in allowlist
// ─────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
import type { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth';

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/**
 * Returns the authenticated user, or null if not signed in.
 * Use this in API routes where the user is optional.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  };
}

/**
 * Returns the authenticated user, or throws a Next.js-like response
 * with status 401. Use this in API routes that require auth.
 *
 * Usage:
 *   const user = await requireUser();
 *   // user.id is guaranteed to be defined past this point
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return user;
}

// ─── Etapa 7.B — RBAC (role-based access control) ────────────
//
// Two new helpers pair with `requireUser()`:
//
//   - getCurrentUserWithRole()
//       Same as getCurrentUser() but ALSO returns the role. The role
//       is read from the JWT (set by the jwt callback in auth.ts) so
//       no extra DB hit is needed on every request — the value is
//       cached on the token between sign-in and logout.
//
//   - requireRole(...allowedRoles)
       // Like requireUser() but ALSO checks the user's role is in the
//       allowlist. Throws 401 if not signed in, 403 if signed in but
//       the role isn't allowed.
//
// Note on role freshness: because the role is read from the JWT (which
// is only refreshed on sign-in), promoting a user in the DB will NOT
// take effect until they sign out and sign back in. For CONECTA-LT's
// admin panel this is fine — admin operations are rare and a re-login
// is acceptable. (If we needed instant propagation, we would fetch the
// role from the DB on every request — at the cost of a DB hit per
// protected call. We don't need that today.)

/**
 * Returns the authenticated user WITH their role, or null if not signed in.
 * The role comes from the JWT (populated by the jwt callback in auth.ts).
 */
export async function getCurrentUserWithRole(): Promise<
  (SessionUser & { role: UserRole }) | null
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const role = session.user.role ?? 'USER';
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role,
  };
}

/**
 * Like requireUser(), but also checks the user has one of the allowed
 * roles. Throws 401 if not signed in, 403 if the role isn't allowed.
 *
 * Usage:
 *   // Only business owners (and admins acting on their behalf) can claim:
 *   const user = await requireRole('BUSINESS_OWNER', 'ADMIN');
 *
 * The returned user object includes `role` so the caller can branch on
 * it (e.g. an admin claim vs. an owner claim).
 */
export async function requireRole(
  ...allowedRoles: UserRole[]
): Promise<SessionUser & { role: UserRole }> {
  const user = await getCurrentUserWithRole();
  if (!user) {
    throw new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!allowedRoles.includes(user.role)) {
    throw new Response(JSON.stringify({ error: 'Acceso denegado' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }
  return user;
}
