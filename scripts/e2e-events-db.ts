// ─────────────────────────────────────────────────────────────
// E2E real del ABM de eventos (Sprint 8.6) contra standalone :3100
// + Neon productivo. Cubre auth (demo provider → JWT con role),
// guards 401, filtros, CRUD completo y validaciones 400.
//
// Uso (server y test en la MISMA llamada bash — el sandbox mata
// procesos background entre tool calls):
//   set -a; source .env; set +a
//   NODE_ENV=production PORT=3100 bun .next/standalone/server.js &
//   sleep 5; unset DATABASE_URL DIRECT_URL; bun scripts/e2e-events-db.ts
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const BASE = 'http://localhost:3100';
const ADMIN_EMAIL = 'sqn8nproyect@gmail.com';
const TEST_WEEK = '2026-09-19'; // sábado siguiente a la semana seedeada

const prisma = new PrismaClient();
let passed = 0;
let failed = 0;

function log(step: string, ok: boolean, extra = '') {
  console.log(`${ok ? '✅' : '🔴'} ${step}${extra ? ' — ' + extra : ''}`);
  if (ok) passed++;
  else failed++;
}

function jarFrom(res: Response, prev = ''): string {
  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [];
  const fresh = setCookies.map((c) => c.split(';')[0]);
  const keep = prev ? prev.split('; ') : [];
  // las cookies nuevas pisan a las viejas con el mismo nombre
  for (const c of fresh) {
    const name = c.split('=')[0];
    const idx = keep.findIndex((k) => k.startsWith(name + '='));
    if (idx >= 0) keep[idx] = c;
    else keep.push(c);
  }
  return keep.join('; ');
}

async function main() {
  // ── 0. Local real para el FK ─────────────────────────────────
  const biz = await prisma.business.findFirst({
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  if (!biz) throw new Error('No hay businesses en la DB');
  console.log(`── Local de prueba: ${biz.name}\n`);

  // ── 1. CSRF ──────────────────────────────────────────────────
  let res = await fetch(`${BASE}/api/auth/csrf`);
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  let jar = jarFrom(res);
  log('GET /api/auth/csrf', res.ok && !!csrfToken, `csrf=${csrfToken.slice(0, 10)}...`);

  // ── 2. Login demo con el email admin ────────────────────────
  res = await fetch(`${BASE}/api/auth/callback/demo`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: jar,
    },
    body: new URLSearchParams({
      csrfToken,
      email: ADMIN_EMAIL,
      callbackURL: BASE,
      json: 'true',
    }),
    redirect: 'manual',
  });
  jar = jarFrom(res, jar);
  const hasSession = jar.includes('authjs.session-token=');
  log('POST /api/auth/callback/demo (login admin)', res.status < 400 && hasSession, `status=${res.status} session=${hasSession ? 'SÍ' : 'NO'}`);

  // ── 3. Sesión expone role=ADMIN (allowlist email) ───────────
  res = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: jar } });
  const session = (await res.json()) as { user?: { role?: string; email?: string } };
  log(
    'GET /api/auth/session → role=ADMIN',
    session?.user?.role === 'ADMIN',
    `role=${session?.user?.role} email=${session?.user?.email}`,
  );

  // ── 4. Guard: API admin SIN cookie → 401/403 ────────────────
  res = await fetch(`${BASE}/api/admin/events`);
  log('GET /api/admin/events (anónimo) → 401/403', res.status === 401 || res.status === 403, `status=${res.status}`);

  // ── 5. GET con sesión → lista completa ──────────────────────
  res = await fetch(`${BASE}/api/admin/events`, { headers: { cookie: jar } });
  const all = (await res.json()) as Array<Record<string, unknown>>;
  log('GET /api/admin/events (admin)', res.ok && Array.isArray(all) && all.length >= 12, `status=${res.status} total=${all.length}`);

  // ── 6. Filtro ?status=DRAFT ─────────────────────────────────
  res = await fetch(`${BASE}/api/admin/events?status=DRAFT`, { headers: { cookie: jar } });
  const drafts = (await res.json()) as Array<{ status: string }>;
  log('GET ?status=DRAFT', res.ok && drafts.every((e) => e.status === 'DRAFT'), `drafts=${drafts.length}`);

  // ── 7. POST válido → 201 ────────────────────────────────────
  res = await fetch(`${BASE}/api/admin/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: jar },
    body: JSON.stringify({
      businessId: biz.id,
      title: 'TEST E2E — evento borrable',
      tagline: 'Prueba automatizada Sprint 8.6 (se elimina al final)',
      emoji: '🧪',
      theme: 'violet',
      dayLabel: 'Sáb 19',
      dateLabel: '19 Sep',
      timeLabel: '8:00 PM — 2:00 AM',
      startsAt: '2026-09-19T20:00:00.000-04:00',
      weekOf: TEST_WEEK,
      status: 'DRAFT',
      sortOrder: 999,
    }),
  });
  const created = (await res.json()) as {
    id?: string;
    weekOf?: string;
    status?: string;
    theme?: string;
    business?: { id?: string };
  };
  const testId = created?.id;
  log('POST válido → 201', res.status === 201 && !!testId, `id=${testId?.slice(0, 8)}... weekOf=${created?.weekOf} status=${created?.status}`);

  // ── 8. POST theme inválido → 400 ────────────────────────────
  res = await fetch(`${BASE}/api/admin/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: jar },
    body: JSON.stringify({
      businessId: biz.id,
      title: 'X',
      tagline: 'X',
      dayLabel: 'X',
      dateLabel: 'X',
      timeLabel: 'X',
      startsAt: '2026-09-19T20:00:00.000-04:00',
      weekOf: TEST_WEEK,
      theme: 'neon-unicorn',
    }),
  });
  log('POST theme inválido → 400', res.status === 400, `status=${res.status}`);

  // ── 9. POST sin title → 400 ─────────────────────────────────
  res = await fetch(`${BASE}/api/admin/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: jar },
    body: JSON.stringify({
      businessId: biz.id,
      tagline: 'sin título',
      dayLabel: 'X',
      dateLabel: 'X',
      timeLabel: 'X',
      startsAt: '2026-09-19T20:00:00.000-04:00',
      weekOf: TEST_WEEK,
    }),
  });
  log('POST sin title → 400', res.status === 400, `status=${res.status}`);

  // ── 10. PATCH: renombrar + publicar ─────────────────────────
  res = await fetch(`${BASE}/api/admin/events/${testId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: jar },
    body: JSON.stringify({
      title: 'TEST E2E — publicado',
      status: 'PUBLISHED',
      promoNote: '2x1 TEST',
    }),
  });
  const patched = (await res.json()) as {
    title?: string;
    status?: string;
    promoNote?: string | null;
  };
  log(
    'PATCH título+PUBLISHED → 200',
    res.ok && patched?.title === 'TEST E2E — publicado' && patched?.status === 'PUBLISHED',
    `title="${patched?.title}" status=${patched?.status} promo=${patched?.promoNote}`,
  );

  // ── 11. Filtro ?weekOf encuentra el test ────────────────────
  res = await fetch(`${BASE}/api/admin/events?weekOf=${TEST_WEEK}`, { headers: { cookie: jar } });
  const weekRows = (await res.json()) as Array<{ id?: string }>;
  log('GET ?weekOf contiene el evento test', res.ok && weekRows.some((e) => e.id === testId), `rows=${weekRows.length}`);

  // ── 12. DELETE → 200 y ya no existe ─────────────────────────
  res = await fetch(`${BASE}/api/admin/events/${testId}`, {
    method: 'DELETE',
    headers: { cookie: jar },
  });
  const del = (await res.json()) as { id?: string };
  log('DELETE → 200', res.ok && del?.id === testId, `id=${del?.id?.slice(0, 8)}...`);
  res = await fetch(`${BASE}/api/admin/events/${testId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', cookie: jar },
    body: JSON.stringify({ title: 'zombie' }),
  });
  log('PATCH tras DELETE → 404', res.status === 404, `status=${res.status}`);

  // ── resumen ─────────────────────────────────────────────────
  console.log(`\n═══ RESULTADO: ${passed} ✅ / ${failed} 🔴 ═══`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('FATAL:', e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
