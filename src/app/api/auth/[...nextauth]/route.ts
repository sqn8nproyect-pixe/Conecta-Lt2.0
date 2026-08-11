// /api/auth/[...nextauth] — NextAuth.js v4 catch-all route.
//
// DEBUG WRAPPER: temporarily wraps the NextAuth handler to inspect
// the response. If it's an error redirect (Location header contains
// ?error=), we append the last captured NextAuth error as
// ?debug_error=... so we can see WHY the OAuth flow failed (the
// default NextAuth only returns a generic "OAuthCallback" code).
//
// Remove this wrapper once the Google OAuth issue is resolved.

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

async function debugWrapper(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> },
): Promise<Response> {
  // Lazily import the module-level _lastAuthError. We can't import it
  // directly because it's a `let` in auth.ts and not exported. Instead
  // we rely on the redirect callback (configured in authOptions) to
  // append ?debug_error= to the URL when _lastAuthError is set.
  const res = await handler(req, ctx);

  // Belt-and-suspenders: if the Location header has ?error= but no
  // ?debug_error=, we try to read the global state directly via a
  // side-channel. The _lastAuthError is captured by our logger.error
  // override. We re-import auth.ts to access it.
  try {
    const location = res.headers.get('location');
    if (location && location.includes('error=') && !location.includes('debug_error=')) {
      // Try to pull _lastAuthError from the auth module
      const authModule = await import('@/lib/auth');
      const lastErr = (authModule as unknown as { _getLastAuthError?: () => unknown })._getLastAuthError?.();
      if (lastErr) {
        const encoded = encodeURIComponent(JSON.stringify(lastErr).slice(0, 1500));
        const sep = location.includes('?') ? '&' : '?';
        const newLocation = `${location}${sep}debug_error=${encoded}`;
        const newHeaders = new Headers(res.headers);
        newHeaders.set('location', newLocation);
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: newHeaders,
        });
      }
    }
  } catch {
    // ignore — never let the debug capture break the response
  }

  return res;
}

export { debugWrapper as GET, debugWrapper as POST };
