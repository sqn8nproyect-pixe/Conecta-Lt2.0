// /api/diagnose-auth/cookie-probe — Probador de cookies para el navegador
// del dueño (especialmente tablets/móviles).
//
// Contexto (2026-09-11): el login con Google fallaba en la tablet del dueño
// con "pkceCodeVerifier cookie was missing" — el navegador descartaba la
// cookie PKCE durante el viaje a Google y de vuelta. Este endpoint permite
// CONFIRMAR en 20 segundos si un navegador guarda y reenvía cookies:
//
//   1. Visita la URL una vez → Set-Cookie: cl_probe=1.
//   2. Recarga / visita de nuevo → debe decir visitas: 2, 3, 4…
//
// Si el contador NO sube entre visitas, el navegador está bloqueando o
// borrando cookies (modo incógnito agresivo, navegador integrado de otra
// app, "bloquear cookies" activado, etc.) y por eso falla el login OAuth.
//
// No expone secretos: solo cuenta cookies y lista NOMBRES (no valores).

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function GET(request: NextRequest) {
  const prev = Number(request.cookies.get('cl_probe')?.value ?? '0');
  const visitas = Number.isFinite(prev) && prev >= 0 ? prev + 1 : 1;

  // Nombres de cookies recibidas (sin valores — nada sensible).
  const nombres = request.cookies
    .getAll()
    .map((c) => c.name)
    .sort();

  const authjs = nombres.filter((n) => n.startsWith('authjs.'));

  const res = NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      visitas_registradas: visitas,
      cookies_recibidas: nombres.length,
      cookies_authjs: authjs,
      user_agent: request.headers.get('user-agent') ?? '(sin UA)',
      diagnostico:
        visitas === 1
          ? 'Cookie de prueba entregada (cl_probe=1). Recarga esta página: si "visitas_registradas" sube a 2, tu navegador SÍ guarda cookies y el problema del login es otro. Si se queda en 1, tu navegador está borrando/bloqueando cookies — esa es la causa del fallo del login.'
          : `El contador subió (${visitas}): tu navegador SÍ conserva cookies de este sitio en este contexto. Si el login sigue fallando aquí, prueba cerrar otras pestañas del sitio y volver a intentar; y si estás dentro del navegador integrado de WhatsApp/Facebook, abre conectalt.com en Chrome/Safari normal.`,
      nota: 'Si estás viendo esto dentro del navegador de WhatsApp/Facebook/Instagram, las cookies pueden no persistir — abre conectalt.com en Chrome/Safari normal.',
    },
    { status: 200 },
  );

  // Cookie de prueba: 1 año, SameSite=Lax, Secure, httpOnly (igual que la
  // PKCE de Auth.js en lo que importa para este test).
  res.cookies.set('cl_probe', String(visitas), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });

  return res;
}
