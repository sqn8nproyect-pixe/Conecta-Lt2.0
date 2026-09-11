// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — Auth.js v5 configuration (migrado desde
// NextAuth v4 el 2026-09-10 — ver worklog: migracion-authjs-v5)
// ─────────────────────────────────────────────────────────────
// Providers:
//   1. Google OAuth  →  when NEXT_PUBLIC_GOOGLE_CLIENT_ID/SECRET are set
//   2. Credentials   →  demo fallback for dev/testing when Google
//                       OAuth is not configured. Only authenticates
//                       EXISTING users — never creates new users
//                       with fake data (Google is the single source
//                       of truth for user identity, name and avatar).
//
// Adapter:  @auth/prisma-adapter  (Account, Session, VerificationToken)
// Strategy: JWT (default) — we read session.user.id on the server
//           via auth() (v5) from src/server/auth.ts helpers.
//
// MIGRACIÓN v4 → v5 (2026-09-10):
//   - NextAuth(config) ahora devuelve { handlers, auth, signIn, signOut }.
//   - getServerSession(authOptions) → auth() (en src/server/auth.ts).
//   - secret explícito: prioriza AUTH_SECRET (naming v5) pero cae a
//     NEXTAUTH_SECRET para que el deploy en Vercel NO requiera tocar
//     env vars y las sesiones JWT existentes sobrevivan el deploy
//     (mismo secreto = misma firma = cero re-logins forzados).
//   - PATCH REMOVIDO: v5 usa oauth4webapi (no openid-client), por lo
//     que el check estricto RFC 9207 de `iss` ya no existe y el
//     scripts/patch-openid-client.js fue eliminado del postinstall.
//   - trustHost: true ahora es tipo oficial (v4 daba error TS).
// ─────────────────────────────────────────────────────────────

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { after } from 'next/server';
import { customFetch } from '@auth/core';
import type { UserRole } from '@prisma/client';

import { db } from '@/lib/db';
import { isAdminEmail } from '@/lib/admin-config';

/**
 * FIX login Google en producción (2026-09-11 — "error=Configuration"):
 *
 * Google agregó `authorization_response_iss_parameter_supported: true` a su
 * discovery document. oauth4webapi (usado por Auth.js v5) interpreta eso
 * como: "si el flag está, el callback DEBE traer `iss`", y lanza
 * `response parameter "iss" (issuer) missing` cuando el redirect de Google
 * llega sin él → CallbackRouteError → redirect a /auth/error?error=Configuration.
 *
 * En la era v4 este check se neutralizaba con un monkey-patch
 * (scripts/patch-openid-client.js, eliminado en la migración a v5 porque se
 * asumió que el check ya no existía — volvió por esta vía).
 *
 * FIX: interceptar SOLO el discovery y quitar la marca del metadata. Esto
 * desactiva el requisito; si `iss` viene presente en el callback, oauth4webapi
 * sigue validándolo contra as.issuer (la línea `iss !== as.issuer` permanece).
 * Token/userinfo pasan sin modificar.
 */
const googleCustomFetch: typeof fetch = async (url, init) => {
  const res = await fetch(url, init);
  const href =
    typeof url === 'string'
      ? url
      : url instanceof URL
        ? url.href
        : url instanceof Request
          ? url.url
          : String(url);
  if (href.includes('/.well-known/openid-configuration')) {
    try {
      const json = (await res.json()) as Record<string, unknown>;
      delete json.authorization_response_iss_parameter_supported;
      return new Response(JSON.stringify(json), {
        status: res.status,
        statusText: res.statusText,
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      // Si no se pudo parsear, devolver la respuesta original intacta.
      return res;
    }
  }
  return res;
};

/**
 * Serializa la cadena completa de causas de un error para diagnóstico.
 *
 * Particularidad de @auth/core v5: la `cause` de un AuthError NO es un
 * Error sino un objeto `{ err: ErrorOriginal, ...contexto }` (ver
 * errors.js — `super(undefined, { cause: { err: message, ... } })`).
 * Además en producción Next minifica los nombres (AuthError → "m").
 * Este helper recorre: Error → causa-objeto (extrae err + contexto
 * plano) → Error interno → objetos crudos (respuestas oauth4webapi).
 */
function serializeErrorChain(err: unknown, maxDepth = 4): string {
  const parts: string[] = [];
  let cur: unknown = err;
  let depth = 0;
  while (depth < maxDepth) {
    if (cur instanceof Error) {
      const cls = cur.name || cur.constructor?.name || '?';
      parts.push(`${cls}: ${cur.message}`.slice(0, 600));
      const cause = (cur as { cause?: unknown }).cause;
      if (cause instanceof Error) {
        cur = cause;
        depth++;
        continue;
      }
      if (cause && typeof cause === 'object') {
        const c = cause as Record<string, unknown>;
        // Contexto plano útil (provider, providerAccountId, status…)
        const ctx = Object.entries(c)
          .filter(([k, v]) => k !== 'err' && v !== undefined && typeof v !== 'object')
          .map(([k, v]) => `${k}=${String(v).slice(0, 80)}`)
          .join(', ');
        if (ctx) parts.push(`contexto: {${ctx}}`.slice(0, 400));
        cur = c.err;
        depth++;
        continue;
      }
      break;
    }
    if (cur !== null && cur !== undefined) {
      if (typeof cur === 'object') {
        try {
          parts.push(`objeto: ${JSON.stringify(cur)}`.slice(0, 800));
        } catch {
          parts.push(`objeto no serializable: ${String(cur)}`.slice(0, 300));
        }
      } else {
        parts.push(String(cur).slice(0, 300));
      }
    }
    break;
  }
  return parts.join('  ⤶  ').slice(0, 4000) || 'sin mensaje';
}

/**
 * Auth.js v5 instance. We instantiate providers conditionally so the
 * app boots cleanly whether or not Google creds are present.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  // Secret: v5 lee AUTH_SECRET por convención, pero pasar explícito con
  // fallback a NEXTAUTH_SECRET garantiza continuidad en Vercel (donde
  // hoy solo existe NEXTAUTH_SECRET de la era v4) y evita re-logins.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Trust the Host header so the app works behind the Caddy gateway
  // (the browser sees the gateway domain, not localhost:3000) and on
  // Vercel preview/production URLs.
  trustHost: true,
  // WORKAROUND (portado de v4 — sigue siendo válido en v5): las cookies
  // con prefix __Host-/__Secure- que Auth.js setea por default en
  // contextos seguros pueden no preservarse correctamente en el flujo
  // OAuth de Vercel (state cookie se pierde entre el redirect a Google
  // y el callback de vuelta → OAuthCallback error). Configuramos
  // cookies manualmente con nombres authjs.* SIN prefix para evitar
  // este issue. Sacrifica un poco de seguridad (sin prefix enforcement)
  // pero hace que OAuth funcione detrás de gateways/proxies.
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: 'authjs.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: 'authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    pkceCodeVerifier: {
      name: 'authjs.pkce.code_verifier',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    state: {
      name: 'authjs.state',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
    nonce: {
      name: 'authjs.nonce',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
  debug: process.env.NODE_ENV !== 'production',
  logger: {
    // Surface Auth.js errors with full context — by default they are
    // silenced in production which makes OAuth issues impossible to
    // diagnose. We always log errors regardless of NODE_ENV, AND we
    // persist them to the DB (AuthErrorLog) so they can be read via
    // /api/diagnose-auth/last-auth-error — Vercel function logs are
    // not accessible from the dev sandbox.
    error(...args: unknown[]) {
      // v5 llama logger.error(error) con UN argumento casi siempre
      // (a veces [code, error]). Manejar ambas aridades.
      const err: unknown = args.length >= 2 ? args[1] : args[0];
      const logCode = args.length >= 2 ? String(args[0]) : undefined;

      let name = '';
      let message = '';
      let stack: string | undefined;
      if (err instanceof Error) {
        name = err.name;
        message = serializeErrorChain(err);
        stack = err.stack?.slice(0, 2500);
      } else if (typeof err === 'string') {
        message = err;
      } else {
        try {
          message = JSON.stringify(err) ?? String(err);
        } catch {
          message = String(err);
        }
      }
      message = message.slice(0, 4000);

      console.error('[authjs][error]', logCode ?? name, message);

      // Persistir el error en Neon (AuthErrorLog) para diagnosticarlo vía
      // /api/diagnose-auth/last-auth-error. En serverless un `void promise`
      // muere cuando la función se congela al responder (probado: la fila
      // nunca llegó) — `after()` de Next mantiene el runtime vivo hasta
      // completar. Fuera de contexto de request, fallback a fire-and-forget.
      const persistir = () =>
        db.authErrorLog
          .create({ data: { code: (logCode ?? name) || null, message, stack } })
          .then(() =>
            db.authErrorLog.deleteMany({
              where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 3600 * 1000) } },
            }),
          )
          .catch((e) => console.error('[authjs][error-capture] fallo al persistir:', e));
      try {
        after(persistir);
      } catch {
        void persistir();
      }
    },
    warn(code: string) {
      console.warn('[authjs][warn]', code);
    },
    debug(message: string) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[authjs][debug]', message);
      }
    },
  },
  pages: {
    // We don't ship a custom sign-in page; the navbar triggers
    // signIn('google') or signIn('demo') directly.
    signIn: '/',
    // Custom Spanish error page (brand-consistent) instead of the raw
    // English Auth.js error card. All auth failures redirect here:
    //   /auth/error?error=Configuration|Callback|AccessDenied|...
    error: '/auth/error',
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
            // Ver comentario de googleCustomFetch: neutraliza el check
            // RFC 9207 de oauth4webapi que rompe el login cuando el
            // redirect de Google llega sin `iss`.
            [customFetch]: googleCustomFetch,
          }),
        ]
      : []),
    // Demo fallback: only authenticates EXISTING users. Never
    // creates new users (Google OAuth is the single source of truth
    // for user identity, name, and avatar). Never overwrites
    // name/image — those come exclusively from Google.
    CredentialsProvider({
      id: 'demo',
      name: 'Cuenta Demo',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        try {
          // v5 tipa credentials como Partial<Record<..., unknown>> →
          // cast explícito a string antes de trim().
          const email = (credentials?.email as string | undefined)?.trim().toLowerCase();
          if (!email) {
            console.error('[auth.demo.authorize] no email provided');
            return null;
          }

          // Only authenticate existing users — no upsert, no create.
          // Google OAuth is responsible for creating users with
          // their real name and avatar.
          const user = await db.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, image: true },
          });

          if (!user) {
            console.error(
              `[auth.demo.authorize] user not found: ${email}. ` +
              'Users must sign in with Google at least once before the demo login works.',
            );
            return null;
          }

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
    // ── JWT ────────────────────────────────────────────────
    // Persist the user id AND role on the token so the session can
    // expose them. The `user` argument is only present on the FIRST
    // sign-in call (CredentialsProvider.authorize return value), so we
    // use that opportunity to fetch the role from the DB. Subsequent
    // JWT rotations just carry `token.role` forward (no DB hit).
    //
    // Etapa 7.B — added `role` for RBAC.
    //
    // ADMIN ACCESS: only the emails in ADMIN_EMAILS (src/lib/admin-config.ts)
    // can have role=ADMIN. The DB role is OVERRIDDEN based on email —
    // this means promoting a user in the DB to ADMIN has NO effect
    // unless their email is in ADMIN_EMAILS. This is the single source
    // of truth for admin access.
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
        let role = (dbUser?.role ?? 'USER') as UserRole;
        // ADMIN access is granted SOLELY by email allowlist. The DB
        // role is ignored for admin purposes — even if the DB says
        // ADMIN, the user won't get admin unless their email is in
        // ADMIN_EMAILS. Conversely, an email in ADMIN_EMAILS always
        // gets ADMIN even if the DB says USER.
        const userEmail = (user as { email?: string }).email ?? token.email;
        if (isAdminEmail(userEmail)) {
          role = 'ADMIN';
        } else if (role === 'ADMIN' || role === 'MODERATOR') {
          // Strip admin role from any email not in the allowlist.
          // This prevents admin@conecta.lt or moderator@conecta.lt
          // (legacy demo users) from accessing the panel.
          role = 'USER';
        }
        token.role = role;
        // Persist the email on the token so server-side checks can
        // verify admin access by email (defense in depth).
        token.email = userEmail;
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
});
