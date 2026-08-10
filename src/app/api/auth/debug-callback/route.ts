// /api/auth/debug-callback — TEMPORARY debug endpoint
// Returns the OAuthCallback error reason as JSON so we can diagnose
// the Google OAuth flow without access to Vercel runtime logs.
// DELETE THIS FILE after the issue is fixed.
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    url: url.toString(),
  };

  // 1. Verificar variables de entorno
  diagnostics.env = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✅ set' : '❌ missing',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✅ set' : '❌ missing',
    AUTH_SECRET: process.env.AUTH_SECRET ? '✅ set' : '❌ missing',
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ? `✅ ${process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID.substring(0, 20)}...`
      : '❌ missing',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      ? `✅ ${process.env.GOOGLE_CLIENT_SECRET.substring(0, 8)}...`
      : '❌ missing',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ set' : '❌ missing',
    DIRECT_URL: process.env.DIRECT_URL ? '✅ set' : '❌ missing',
  };

  // 2. Verificar conexión a BD
  try {
    const userCount = await db.user.count();
    const accountCount = await db.account.count();
    diagnostics.database = {
      status: '✅ connected',
      users: userCount,
      accounts: accountCount,
    };
  } catch (e) {
    diagnostics.database = {
      status: '❌ error',
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // 3. Verificar providers configurados
  const providers = authOptions.providers.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
  }));
  diagnostics.providers = providers;

  // 4. Si hay código de autorización, intentar el intercambio manualmente
  const code = url.searchParams.get('code');
  if (code) {
    diagnostics.received_code = `${code.substring(0, 15)}...`;
    try {
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/google`;
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      diagnostics.google_token_exchange = {
        status: tokenRes.status,
        response: tokenData,
      };
    } catch (e) {
      diagnostics.google_token_exchange = {
        status: 'fetch_error',
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
