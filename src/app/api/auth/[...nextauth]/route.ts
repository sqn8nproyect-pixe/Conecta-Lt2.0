// /api/auth/[...nextauth] — NextAuth.js v4 catch-all route.
//
// NOTA: NO sobreescribimos el logger aquí. El logger configurado en
// `authOptions` (src/lib/auth.ts) es el que se usa, y está diseñado
// para loggear errores SIEMPRE (incluso en producción) para poder
// diagnosticar problemas de OAuthCallback.
//
// El override anterior silenciaba warn() y debug() — pero también
// ocultaba errores reales de OAuth (como el callback de Google que
// estábamos investigando). Por eso ahora dejamos que el logger de
// authOptions maneje todo.

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
