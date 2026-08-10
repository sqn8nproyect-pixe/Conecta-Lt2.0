// /api/auth/[...nextauth] — NextAuth.js v4 catch-all route.
//
// Wraps NextAuth with explicit error logging so we can diagnose
// OAuthCallback errors in production (Vercel logs).
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth({
  ...authOptions,
  // Log all auth events to the server console (Vercel runtime logs).
  logger: {
    error(code, message) {
      console.error('[next-auth][error]', code, message);
    },
    warn(code) {
      console.warn('[next-auth][warn]', code);
    },
    debug(code, message) {
      console.log('[next-auth][debug]', code, message);
    },
  },
  events: {
    async signIn(message) {
      console.log('[next-auth][event] signIn OK:', {
        user: message.user?.email,
        account: message.account?.provider,
      });
    },
    async signOut() {
      console.log('[next-auth][event] signOut');
    },
    async createUser(message) {
      console.log('[next-auth][event] createUser:', message.user?.email);
    },
    async linkAccount(message) {
      console.log('[next-auth][event] linkAccount:', {
        provider: message.account?.provider,
        user: message.user?.email,
      });
    },
  },
});

export { handler as GET, handler as POST };
