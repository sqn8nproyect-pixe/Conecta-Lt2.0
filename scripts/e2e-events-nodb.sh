#!/bin/bash
# E2E sin DB (Sprint 8.6) — valida wiring de rutas + guard de auth
cd /home/z/my-project || exit 1
set -a; source .env; set +a
export NODE_ENV=production PORT=3100 HOSTNAME=127.0.0.1

# Arrancar server y probar TODO en esta misma llamada (sandbox mata background)
bun .next/standalone/server.js > /tmp/s86-server.log 2>&1 &
SRV=$!

for i in $(seq 1 30); do
  curl -s -o /dev/null http://127.0.0.1:3100/api/auth/session && break
  sleep 0.5
done

PASS=0; FAIL=0
check() { # name expected_status actual_status
  if [ "$2" = "$3" ]; then echo "✅ $1 → $3"; PASS=$((PASS+1));
  else echo "❌ $1 → esperado $2, obtenido $3"; FAIL=$((FAIL+1)); fi
}

# 1. Rutas admin de eventos existen + auth guard (sin sesión → 401, ANTES de tocar DB)
S=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/api/admin/events)
check "GET /api/admin/events sin sesión → 401" 401 "$S"

S=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'content-type: application/json' \
  -d '{"businessId":"x","title":"t","tagline":"t","dayLabel":"A","dateLabel":"B","timeLabel":"C","startsAt":"2026-09-18T22:00:00-04:00","weekOf":"2026-09-19"}' \
  http://127.0.0.1:3100/api/admin/events)
check "POST /api/admin/events sin sesión → 401" 401 "$S"

S=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H 'content-type: application/json' \
  -d '{"status":"DRAFT"}' http://127.0.0.1:3100/api/admin/events/test-id)
check "PATCH /api/admin/events/[id] sin sesión → 401" 401 "$S"

S=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE http://127.0.0.1:3100/api/admin/events/test-id)
check "DELETE /api/admin/events/[id] sin sesión → 401" 401 "$S"

# 2. Rutas admin preexistentes siguen en pie (no rompimos nada)
S=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/api/admin/businesses)
check "GET /api/admin/businesses sin sesión → 401" 401 "$S"

# 3. Páginas públicas siguen respondiendo (server sano)
S=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3100/editorial)
check "GET /editorial → 200" 200 "$S"

# 4. El bundle del dashboard incluye el tab Eventos (chunk cargado)
JS=$(rg -l "Eventos & Flyers|Nuevo evento" .next/standalone/.next/static/chunks 2>/dev/null | head -1)
if [ -n "$JS" ]; then echo "✅ Bundle cliente contiene EventsTab → $JS"; PASS=$((PASS+1));
else echo "❌ EventsTab NO encontrado en chunks"; FAIL=$((FAIL+1)); fi

kill $SRV 2>/dev/null
echo "───"
echo "RESULTADO: $PASS pass / $FAIL fail"
[ $FAIL -eq 0 ]
