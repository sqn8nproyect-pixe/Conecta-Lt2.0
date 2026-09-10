// /api/auth/[...nextauth] — Auth.js v5 catch-all route.
// Migrado desde NextAuth v4 (NextAuth(authOptions)) el 2026-09-10:
// v5 exporta `handlers` con GET/POST listos para el App Router.

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
