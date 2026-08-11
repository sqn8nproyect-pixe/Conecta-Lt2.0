// ─────────────────────────────────────────────────────────────
// CONECTA-LT 2.0 — Admin access control
// ─────────────────────────────────────────────────────────────
// Only the emails listed here can access the admin panel.
// This is the SINGLE SOURCE OF TRUTH for admin access — both
// the JWT callback (src/lib/auth.ts) and the backend role check
// (src/server/auth.ts) read from this list.
//
// To grant admin access to a new user, add their email here.
// ─────────────────────────────────────────────────────────────

export const ADMIN_EMAILS: readonly string[] = [
  'sqn8nproyect@gmail.com',
] as const;

/**
 * Returns true if the given email has admin access.
 * Case-insensitive comparison.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return ADMIN_EMAILS.some((e) => e.toLowerCase() === lower);
}
