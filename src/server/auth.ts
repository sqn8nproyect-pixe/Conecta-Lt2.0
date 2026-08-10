// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Server-side session helpers
// Thin wrappers around getServerSession so API routes can:
//   - getCurrentUser()  → returns the user or null
//   - requireUser()     → throws 401 if no session
// ─────────────────────────────────────────────────────────────

import { getServerSession } from 'next-auth';
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
