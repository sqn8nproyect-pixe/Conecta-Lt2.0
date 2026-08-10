// ─────────────────────────────────────────────────────────────
// CONECTA-LT 3.0 — NextAuth.js v4 configuration
// ─────────────────────────────────────────────────────────────
// Providers:
//   1. Google OAuth  →  when GOOGLE_CLIENT_ID/SECRET are set
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
  pages: {
    // We don't ship a custom sign-in page; the navbar triggers
    // signIn('google') or signIn('credentials') directly.
    signIn: '/',
  },
  providers: [
    // Google OAuth (real). Only registered when creds are present.
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
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
      },
    }),
  ],
  callbacks: {
    // ── JWT ────────────────────────────────────────────────
    // Persist the user id on the token so the session exposes it.
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub;
        const img = user.image ?? token.picture;
        token.image = img ?? undefined;
      }
      return token;
    },
    // ── Session ────────────────────────────────────────────
    // Expose session.user.id for server-side use (favorites, reviews).
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string | undefined;
        if (token.image) {
          session.user.image = token.image as string | null;
        }
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
