// /api/diagnose-auth/google-token — Prueba de validez del GOOGLE_CLIENT_SECRET
// configurado en ESTE entorno (local o Vercel) contra el endpoint real de
// tokens de Google, usando un código de autorización falso.
//
// ¿Por qué existe? El error `error=Configuration` de Auth.js v5 tras el
// consentimiento de Google casi siempre es un `invalid_client` en el
// intercambio code→token (secret rotado en Google Cloud Console pero no
// actualizado en Vercel). Este endpoint permite confirmarlo en segundos
// sin acceder a logs y SIN exponer el secret.
//
// Seguro por diseño:
//   - El código es falso a propósito → Google nunca devuelve tokens.
//   - La respuesta solo incluye clases de error (invalid_client /
//     invalid_grant) y metadatos del secret (longitud + prefijo), jamás
//     su valor.
//   - Un atacante no gana nada: no puede usarlo para adivinar el secret
//     (solo dice si EL secret del entorno es válido, sí o no).

import { NextResponse } from 'next/server';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error: 'missing_credentials',
        clientId_set: Boolean(clientId),
        clientSecret_set: Boolean(clientSecret),
      },
      { status: 500 },
    );
  }

  try {
    const body = new URLSearchParams({
      code: 'conectalt-probe-codigo-falso',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: 'https://conectalt.com/api/auth/callback/google',
      grant_type: 'authorization_code',
    });

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });

    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      error_description?: string;
    };
    const gError = data.error ?? null;

    let verdict: string;
    if (gError === 'invalid_client') {
      verdict =
        '❌ INVALID_CLIENT — el GOOGLE_CLIENT_SECRET de este entorno NO es válido. ' +
        'Google Cloud Console tiene otro (¿rotado tras el incidente?). ' +
        'FIX: copiar el secret vigente de Google Cloud Console → Vercel → ' +
        'Environment Variables → GOOGLE_CLIENT_SECRET → Redeploy.';
    } else if (gError === 'invalid_grant') {
      verdict =
        '✅ SECRET VÁLIDO — Google autenticó el cliente correctamente ' +
        '(rechazó solo el código falso a propósito). El secret NO es la ' +
        'causa del error Configuration; revisar cookies del callback o ' +
        'logs de Vercel ([authjs][error]).';
    } else {
      verdict = `⚠ Respuesta inesperada de Google: HTTP ${res.status} ${gError ?? '(sin error)'}`;
    }

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        google_http_status: res.status,
        google_error: gError,
        secret_meta: {
          length: clientSecret.length,
          prefix_gocspx: clientSecret.startsWith('GOCSPX-'),
        },
        verdict,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: 'probe_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
