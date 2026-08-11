// Type augmentation for NextAuth.js v4 — exposes user.id + user.role on
// the session. The `role` is added by the JWT callback (which reads it
// from the DB on first sign-in) and then copied to the session by the
// session callback.
//
// Etapa 7.B: added `role` so the client (via useSession()) and the server
// (via getServerSession) can both read the user's UserRole without an
// extra DB hit on every request.
import 'next-auth';
import 'next-auth/jwt';

import type { UserRole } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** Etapa 7.B — RBAC. Mirrors the Prisma `UserRole` enum. */
      role?: UserRole;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    image?: string;
    /** Etapa 7.B — RBAC role persisted on the JWT. */
    role?: UserRole;
  }
}
