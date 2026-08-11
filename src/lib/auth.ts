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

// Demo user used by the Credentials provider fallback so the app
// is fully functional in the sandbox without real Google creds.
const DEMO_USER = {
  name: 'Ana Rodríguez',
  email: 'ana.rodriguez@gmail.com',
  image: 'https://i.pravatar.cc/150?img=47',
};

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
