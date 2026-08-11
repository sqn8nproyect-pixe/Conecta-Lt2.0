// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — NextAuth.js v4 configuration
// ─────────────────────────────────────────────────────────────
// Providers:
//   1. Google OAuth  →  when NEXT_PUBLIC_GOOGLE_CLIENT_ID/SECRET are set
//   2. Credentials   →  demo fallback (Ana Rodríguez) so the app
//                       is fully functional in the sandbox without
//                       real OAuth credentials.
//
// Adapter:  @auth/prisma-adapter  (Account, Session, VerificationToken)
// Strategy: JWT (default) — we read session.user.id on the server
//           via getServerSession(authOptions).
// ─────────────────────────────────────────────────────────────

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import type { Adapter } from 'next-auth/adapters';
import type { UserRole } from '@prisma/client';

import { db } from '@/lib/db';

// ─────────────────────────────────────────────────────────────
// NOTE: openid-client's strict `iss` parameter check (RFC 9207)
// is patched out via scripts/patch-openid-client.js (runs in
// postinstall). Google's OIDC discovery document declares
// `authorization_response_iss_parameter_supported: true` but
// Google does NOT actually send `iss` in the authorization
// response, which causes openid-client to throw
// `RPError: iss missing from the response` on every Google login.
// The patch comments out the check in node_modules/openid-client/
// lib/client.js. See scripts/patch-openid-client.js for details.
// ─────────────────────────────────────────────────────────────

// Demo user used by the Credentials provider fallback so the app
// is fully functional in the sandbox without real Google creds.
const DEMO_USER = {
  name: 'Ana Rodríguez',
  email: 'ana.rodriguez@gmail.com',
  image: 'https://i.pravatar.cc/150?img=47',
};

// DEBUG: capture the last NextAuth error so we can surface it via the
// redirect URL (the default NextAuth behavior only returns a generic
// "OAuthCallback" error code without the underlying error message).
// This is module-level state — it persists within a single request
// (the OAuth callback is processed in a single GET to /api/auth/callback).
// In serverless each request is a fresh lambda, but the logger.error
// and the redirect happen in the SAME request so this works.
// NOTE: Kept active until we confirm the openid-client iss fix works
// end-to-end. Once confirmed, this debug capture can be removed.
let _lastAuthError: { message: string; stack?: string; code?: string } | null =
  null;

// Exported getter so the route handler can read this state when
// post-processing the NextAuth response (belt-and-suspenders).
export function _getLastAuthError() {
  return _lastAuthError;
}

/**
 * Build the NextAuth options. We instantiate providers conditionally
 * so the app boots cleanly whether or not Google creds are present.
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: 'jwt' },
  // Trust the Host header so the app works behind the Caddy gateway
  // (the browser sees the gateway domain, not localhost:3000).
  trustHost: true,
  // WORKAROUND para NextAuth v4 + Next.js 16 + Vercel: las cookies con
  // prefix __Host- que NextAuth setea por default pueden no preservarse
  // correctamente en el flujo OAuth (state cookie se pierde entre el
  // redirect a Google y el callback de vuelta → OAuthCallback error).
  // Configuramos cookies manualmente sin el __Host- prefix para evitar
  // este issue. Sacrifica un poco de seguridad (sin prefix enforcement)
  // pero hace que OAuth funcione.
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: 'next-auth.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    state: {
      name: 'next-auth.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    nonce: {
      name: 'next-auth.nonce',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  // Debug: TEMPORALMENTE habilitado en producción para diagnosticar
  // el error OAuthCallback de Google. Cambiar a `process.env.NODE_ENV
  // === 'production' ? false : true` una vez estabilizado.
  debug: true,
  logger: {
    error(...args: unknown[]) {
      // NextAuth v4 logger.error signature: (code: string, error?: unknown)
      // We capture both so the redirect callback can surface the real
      // error message via the URL (otherwise NextAuth only returns the
      // generic "OAuthCallback" code).
      const [code, error] = args;
      // openid-client errors are often class instances with non-enumerable
      // props. We use a safe stringify that captures as much as possible.
      let message: string;
      try {
        if (error instanceof Error) {
          const errorProps = Object.getOwnPropertyNames(error).reduce(
            (acc, key) => {
              acc[key] = (error as unknown as Record<string, unknown>)[key];
              return acc;
            },
            {} as Record<string, unknown>,
          );
          message = JSON.stringify(
            {
              name: error.name,
              message: error.message,
              stack: error.stack?.split('\n').slice(0, 5).join('\n'),
              ...errorProps,
            },
            null,
            2,
          );
        } else if (typeof error === 'string') {
          message = error;
        } else {
          message = JSON.stringify(error, null, 2);
        }
      } catch {
        message = String(error);
      }
      _lastAuthError = {
        message: message.slice(0, 1200),
        code: typeof code === 'string' ? code : undefined,
      };
      // Surface NextAuth errors with full context — by default they
      // are silenced in production which makes OAuthCallback impossible
      // to diagnose. We always log errors regardless of NODE_ENV.
      console.error(
        '[next-auth][error]',
        JSON.stringify({ code, error: message }, null, 2),
      );
    },
    warn(code: string) {
      console.warn('[next-auth][warn]', code);
    },
    debug(message: string) {
      console.log('[next-auth][debug]', message);
    },
  },
  pages: {
    // We don't ship a custom sign-in page; the navbar triggers
    // signIn('google') or signIn('credentials') directly.
    signIn: '/',
  },
  providers: [
    // Google OAuth (real). Only registered when creds are present.
    // We read the client ID from NEXT_PUBLIC_GOOGLE_CLIENT_ID so the
    // Navbar can show/hide the Google button on the client side too.
    ...(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    // Demo fallback: always available. Creates/reuses the demo user
    // in the DB so that server-side operations (favorites, reviews)
    // have a real userId to attach to.
    CredentialsProvider({
      id: 'demo',
      name: 'Cuenta Demo',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        try {
          const email = credentials?.email?.trim() || DEMO_USER.email;
          const name = DEMO_USER.name;
          const image = DEMO_USER.image;

          // upsert so the demo user always exists with a stable id
          const user = await db.user.upsert({
            where: { email },
            update: { name, image },
            create: { email, name, image, role: 'USER' },
            select: { id: true, name: true, email: true, image: true },
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          };
        } catch (err) {
          console.error('[auth.demo.authorize] FAILED:', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    // ── Redirect ──────────────────────────────────────────
    // DEBUG: when NextAuth redirects with ?error=..., it only includes
    // a generic error code (OAuthCallback, OAuthStateMismatch, etc.).
    // We append the actual error message captured by our custom logger
    // so we can see WHY the OAuth flow failed. This is temporary
    // diagnostic code — remove once the OAuth issue is resolved.
    async redirect({ url, baseUrl }) {
      try {
        if (url.includes('error=') && _lastAuthError) {
          const sep = url.includes('?') ? '&' : '?';
          const encoded = encodeURIComponent(
            JSON.stringify(_lastAuthError).slice(0, 1500),
          );
          url = `${url}${sep}debug_error=${encoded}`;
        }
      } catch {
        // ignore — never let the debug capture break the redirect
      }
      return url;
    },
    // ── JWT ────────────────────────────────────────────────
    // Persist the user id AND role on the token so the session can
    // expose them. The `user` argument is only present on the FIRST
    // sign-in call (CredentialsProvider.authorize return value), so we
    // use that opportunity to fetch the role from the DB. Subsequent
    // JWT rotations just carry `token.role` forward (no DB hit).
    //
    // Etapa 7.B — added `role` for RBAC.
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub;
        const img = user.image ?? token.picture;
        token.image = img ?? undefined;
        // Fetch the user's role from the DB once on sign-in. This is
        // a single extra query on the sign-in path (not on every
        // request) and keeps the JWT's role in sync with the DB row
        // at the moment of login.
        const dbUser = await db.user.findUnique({
          where: { id: (user as { id?: string }).id ?? token.sub ?? '' },
          select: { role: true },
        });
        token.role = (dbUser?.role ?? 'USER') as UserRole;
      }
      return token;
    },
    // ── Session ────────────────────────────────────────────
    // Expose session.user.id + session.user.role for client + server use.
    // The role comes from the JWT (set above) so no DB hit is needed on
    // every session read.
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string | undefined;
        if (token.image) {
          session.user.image = token.image as string | null;
        }
        (session.user as { role?: UserRole }).role =
          (token.role as UserRole | undefined) ?? 'USER';
        // name/email fall through from the default JWT callback
      }
      return session;
    },
  },
  events: {
    // When a user signs in with Google for the first time, the Prisma
    // adapter creates the User row automatically. Nothing to do here
    // for the demo flow because authorize() already upserts.
  },
};
