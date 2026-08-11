// /api/auth/diagnose — Endpoint de diagnóstico de configuración OAuth.
// NO expone secretos, solo indica si están configurados y su longitud.
// Útil para depurar errores OAuthCallback sin filtrar credenciales.

import { NextResponse } from 'next/server';

export async function GET() {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,

    // Auth config (solo presencia y longitud, no valor)
    NEXTAUTH_URL: mask(process.env.NEXTAUTH_URL),
    NEXTAUTH_SECRET: presence(process.env.NEXTAUTH_SECRET),
    AUTH_URL: mask(process.env.AUTH_URL),
    AUTH_SECRET: presence(process.env.AUTH_SECRET),

    // Google OAuth
    GOOGLE_CLIENT_ID: mask(process.env.GOOGLE_CLIENT_ID),
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: mask(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: presence(process.env.GOOGLE_CLIENT_SECRET),

    // Database
    DATABASE_URL: mask(process.env.DATABASE_URL),
    DIRECT_URL: mask(process.env.DIRECT_URL),
  };

  // Diagnóstico
  const issues: string[] = [];
  if (!process.env.GOOGLE_CLIENT_SECRET) issues.push('❌ GOOGLE_CLIENT_SECRET no configurado');
  if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) issues.push('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID no configurado');
  if (!process.env.GOOGLE_CLIENT_ID) issues.push('❌ GOOGLE_CLIENT_ID no configurado (necesario para el provider Google)');

  if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    issues.push('❌ Ni NEXTAUTH_SECRET ni AUTH_SECRET están configurados — las cookies de sesión no se podrán desencriptar');
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      && process.env.GOOGLE_CLIENT_ID !== process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
    issues.push('⚠ GOOGLE_CLIENT_ID y NEXT_PUBLIC_GOOGLE_CLIENT_ID tienen valores diferentes — deberían ser el mismo');
  }

  if (!process.env.NEXTAUTH_URL && !process.env.AUTH_URL && process.env.VERCEL) {
    issues.push('⚠ Ni NEXTAUTH_URL ni AUTH_URL configurados en Vercel — trustHost:true debería inferirlo, pero si OAuth falla, prueba setear NEXTAUTH_URL=https://conecta-lt2-0.vercel.app');
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: env,
    diagnosis: issues.length === 0
      ? ['✅ Toda la configuración OAuth necesaria está presente']
      : issues,
    hint: 'Si Google OAuth falla con OAuthCallback, revisa también que la redirect URI https://conecta-lt2-0.vercel.app/api/auth/callback/google esté autorizada en Google Cloud Console.',
  }, { status: 200 });
}

function presence(v: string | undefined): string {
  if (!v) return 'undefined';
  return `set (${v.length} chars)`;
}

function mask(v: string | undefined): string {
  if (!v) return 'undefined';
  // Show first 8 chars + last 4 chars so user can verify it's the right value
  if (v.length <= 12) return `set (${v.length} chars)`;
  return `${v.slice(0, 8)}...${v.slice(-4)} (${v.length} chars)`;
}
