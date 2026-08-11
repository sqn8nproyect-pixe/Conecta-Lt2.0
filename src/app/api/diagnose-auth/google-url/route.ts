// /api/diagnose-auth/google-url — Intenta generar la URL de OAuth de Google
// y hace un HEAD request a Google para ver si acepta los parámetros.

import { NextResponse } from 'next/server';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({
      error: 'Faltan credenciales',
      clientId_set: Boolean(clientId),
      clientSecret_set: Boolean(clientSecret),
    }, { status: 500 });
  }

  const origin = 'https://conecta-lt2-0.vercel.app';
  const callbackUrl = `${origin}/api/auth/callback/google`;
  const nextAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || origin;

  try {
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', 'debug-state-123');
    authUrl.searchParams.set('nonce', 'debug-nonce-456');

    // HEAD request a Google para ver si acepta los parámetros
    const googleResp = await fetch(authUrl.toString(), {
      redirect: 'manual',
      method: 'HEAD',
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      config: {
        clientId_prefix: clientId.slice(0, 12),
        clientId_suffix: clientId.slice(-12),
        clientId_length: clientId.length,
        clientSecret_length: clientSecret.length,
        nextAuthUrl,
        callbackUrl,
        vercel_url: process.env.VERCEL_URL || 'undefined',
      },
      google_response: {
        status: googleResp.status,
        statusText: googleResp.statusText,
        location: googleResp.headers.get('location')?.slice(0, 300) || null,
      },
      google_auth_url: authUrl.toString(),
      hints: [
        googleResp.status === 302
          ? '✅ Google acepta los parámetros — el problema está en NextAuth interno (probablemente cookies/state)'
          : googleResp.status === 400
          ? '❌ Google rechaza la solicitud — redirect URI no autorizada o client_id inválido'
          : `⚠ Status inesperado de Google: ${googleResp.status}`,
      ],
    });
  } catch (err) {
    return NextResponse.json({
      error: 'Exception al generar URL de Google',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5) : null,
    }, { status: 500 });
  }
}
