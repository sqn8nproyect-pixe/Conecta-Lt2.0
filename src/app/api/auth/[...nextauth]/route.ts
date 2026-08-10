// /api/auth/[...nextauth] — NextAuth.js v4 catch-all route.
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth({
  ...authOptions,
  // Only log errors (not debug/warn) to keep production logs clean.
  logger: {
    error(code, message) {
      console.error('[next-auth][error]', code, message);
    },
    warn() {},
    debug() {},
  },
});

export { handler as GET, handler as POST };
