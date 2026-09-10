/**
 * Smoke test E2E de Auth.js v5 — levanta el server y verifica el flujo
 * completo de autenticación (login demo → JWT → sesión → API protegida).
 * Todo en una sola llamada (el sandbox mata procesos background).
 * Uso: bash scripts/auth-smoke-test.sh
 */
const { PrismaClient } = require('@prisma/client');

const BASE = 'http://localhost:3000';
const prisma = new PrismaClient();

function log(step, ok, extra = '') {
  console.log(`${ok ? '✅' : '🔴'} ${step}${extra ? ' — ' + extra : ''}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // 0. Email de un usuario real para el login demo
  const anyUser = await prisma.user.findFirst({
    select: { email: true, name: true, role: true },
  });
  if (!anyUser?.email) throw new Error('No hay usuarios con email en la DB');
  const user = anyUser;
  console.log(`── Usuario demo: ${user.email} (rol DB: ${user.role})\n`);

  // 1. /api/auth/providers
  let res = await fetch(`${BASE}/api/auth/providers`);
  const providers = await res.json();
  log('GET /api/auth/providers', res.ok && providers.demo, JSON.stringify(Object.keys(providers)));

  // 2. /api/auth/session (anónimo) — v5 devuelve null para anónimo (v4 devolvía {})
  res = await fetch(`${BASE}/api/auth/session`);
  const anonSession = await res.json();
  log('GET /api/auth/session (anónimo)', res.ok && anonSession === null, 'null esperado (contrato v5)');

  // 3. /api/auth/csrf + cookies
  res = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = await res.json();
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const cookieJar = setCookies.map((c) => c.split(';')[0]).join('; ');
  log('GET /api/auth/csrf', res.ok && !!csrfToken, `csrf=${csrfToken.slice(0, 12)}... cookies=${setCookies.length}`);

  // 4. Login demo: POST /api/auth/callback/demo
  res = await fetch(`${BASE}/api/auth/callback/demo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: cookieJar,
    },
    body: new URLSearchParams({
      csrfToken,
      email: user.email,
      callbackURL: BASE,
      json: 'true',
    }),
    redirect: 'manual',
  });
  const loginCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const sessionCookie = loginCookies.find((c) => c.includes('authjs.session-token'));
  const newJar = [...cookieJar ? [cookieJar] : [], ...(sessionCookie ? [sessionCookie.split(';')[0]] : [])].join('; ');
  log('POST /api/auth/callback/demo (login)', res.status < 400 && !!sessionCookie,
    `status=${res.status} session-cookie=${sessionCookie ? 'SÍ (' + sessionCookie.split(';')[0].split('=')[1].slice(0, 20) + '...)' : 'NO'}`);

  // 5. GET /api/auth/session con cookie → sesión autenticada
  res = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: newJar } });
  const session = await res.json();
  const hasUser = !!(session && session.user?.id && session.user?.email);
  const roleOk = !!(session && session.user && 'role' in session.user);
  log('GET /api/auth/session (autenticado)', hasUser,
    hasUser ? `user.id=${session.user.id.slice(0, 8)}... role=${session.user.role} name=${session.user.name}` : JSON.stringify(session).slice(0, 120));
  log('JWT callback pobló role (RBAC)', roleOk, `role=${session?.user?.role}`);

  // 6. API protegida con requireUser() + cookie de sesión
  res = await fetch(`${BASE}/api/favorites`, { headers: { cookie: newJar } });
  log('GET /api/favorites (protegida, con sesión)', res.ok, `status=${res.status}`);
  // 6b. La misma API SIN cookie → 401
  res = await fetch(`${BASE}/api/favorites`);
  log('GET /api/favorites (sin sesión) → 401 esperado', res.status === 401, `status=${res.status}`);

  // 7. signout: POST /api/auth/signout con csrf
  res = await fetch(`${BASE}/api/auth/csrf`);
  const csrf2 = (await res.json()).csrfToken;
  const sc2 = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
  const jar2 = [...sc2.map((c) => c.split(';')[0]), ...(sessionCookie ? [sessionCookie.split(';')[0]] : [])].join('; ');
  res = await fetch(`${BASE}/api/auth/signout`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar2 },
    body: new URLSearchParams({ csrfToken: csrf2, callbackURL: BASE, json: 'true' }),
    redirect: 'manual',
  });
  const signoutCookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : [])
    .map((c) => c.split(';')[0]);
  const jar3 = [...signoutCookies, ...(sessionCookie ? [sessionCookie.split(';')[0]] : [])].join('; ');
  // Verificación FUNCIONAL: tras signout, la sesión debe ser null
  res = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar3 } });
  const postSignout = await res.json();
  log('POST /api/auth/signout + sesión nula', res.status < 400 && postSignout === null,
    `status=${res.status} sesión-post-signout=${JSON.stringify(postSignout)}`);
}

main()
  .catch((e) => { console.error('🔴 ERROR:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
