#!/usr/bin/env bash
# chat-api-test.sh — prueba del chat a nivel API con curl (sin navegador).
# Uso: bash scripts/preview-run.sh bash scripts/chat-api-test.sh
# Cubre: 401 anónimo, login demo (Auth.js credentials), abrir conversación
# DIRECT idempotente, enviar mensaje, no leídos, markRead, validación 400,
# bloqueo bidireccional (403) y desbloqueo.
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

B=http://localhost:3000
JA=/tmp/jar-ana.txt; JB=/tmp/jar-beto.txt
rm -f "$JA" "$JB"
PASS=0; FAIL=0

hdr() { echo; echo "== $1 =="; }
ok()  { PASS=$((PASS+1)); echo "PASS: $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

# jget <ruta-estilo-jq sobre la respuesta JSON> — ej: ".csrfToken" | ".[0].id"
# (normaliza solo ".[" inicial → "[" para JS válido: d.csrfToken / d[0].id)
jget() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));try{const v=Function('d','return d'+process.argv[1].replace(/^\.\[/,'['))(d);console.log(v??'')}catch(e){console.log('')}" "$1" 2>/dev/null; }

# login_demo <jar> <email> → deja cookie de sesión en el jar
login_demo() {
  local JAR=$1 EMAIL=$2
  local CSRF
  CSRF=$(curl -s -c "$JAR" "$B/api/auth/csrf" | jget .csrfToken)
  [ -n "$CSRF" ] || { echo "sin csrf para $EMAIL"; return 1; }
  local CODE
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST "$B/api/auth/callback/demo" \
    -d "csrfToken=$CSRF" -d "email=$EMAIL" -d "callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F" -d "json=true")
  echo "  login $EMAIL → HTTP $CODE"
  [ "$CODE" = "200" ] || [ "$CODE" = "302" ] || return 1
}

# ── 1. anónimo ────────────────────────────────
hdr "1. API anónima (esperado 401)"
C1=$(curl -s -o /dev/null -w "%{http_code}" "$B/api/chat/conversations")
[ "$C1" = "401" ] && ok "anónimo recibe 401" || bad "anónimo recibió $C1"

# ── 2. logins ─────────────────────────────────
hdr "2. Login demo ana + beto"
login_demo "$JA" "ana@test.local" && ok "sesión ana" || bad "sesión ana"
login_demo "$JB" "beto@test.local" && ok "sesión beto" || bad "sesión beto"

BETO_ID=$(curl -s -b "$JA" "$B/api/chat/users?q=beto" | jget '.[0].id')
ANA_ID=$(curl -s -b "$JB" "$B/api/chat/users?q=ana" | jget '.[0].id')
echo "  ana id = $ANA_ID · beto id = $BETO_ID"
[ -n "$BETO_ID" ] && [ -n "$ANA_ID" ] && ok "búsqueda de usuarios (ambas direcciones)" || bad "búsqueda de usuarios vacía"
[ -n "$ANA_ID" ] || ANA_ID=$(curl -s -b "$JA" "$B/api/chat/users?q=ana" | jget '.[0].id')

# ── 3. abrir conversación (idempotente) ───────
hdr "3. Abrir conversación DIRECT (POST idempotente)"
CONV1=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}")
CONV2=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}")
CID=$(echo "$CONV1" | jget .id)
CID2=$(echo "$CONV2" | jget .id)
[ -n "$CID" ] && [ "$CID" = "$CID2" ] && ok "conversación abierta y reabierta = misma ($CID)" || bad "no idempotente: $CID vs $CID2"

# ── 4. enviar mensaje ─────────────────────────
hdr "4. Ana envía mensaje por API"
M4=$(curl -s -o /tmp/m4.json -w "%{http_code}" -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" \
  -H 'content-type: application/json' -d '{"kind":"TEXT","text":"Mensaje de prueba via API curl"}')
[ "$M4" = "200" ] || [ "$M4" = "201" ] && ok "POST mensaje → HTTP $M4" || { bad "POST mensaje → $M4"; cat /tmp/m4.json; }
MID=$(jget .id < /tmp/m4.json)

# ── 5. no leídos en bandeja de beto ───────────
hdr "5. Bandeja de beto (no leídos)"
UNREAD=$(curl -s -b "$JB" "$B/api/chat/conversations" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const c=(d.find?d:[]).find(x=>x.id==='$CID');console.log(c?c.unreadCount:'NO_CONVO')" 2>/dev/null)
[ "$UNREAD" -ge 1 ] 2>/dev/null && ok "beto ve unreadCount=$UNREAD" || bad "unreadCount beto = '$UNREAD'"

# ── 6. beto lee los mensajes ──────────────────
hdr "6. Beto obtiene mensajes"
FOUND=$(curl -s -b "$JB" "$B/api/chat/conversations/$CID/messages" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const ms=d.messages||d||[];const hit=ms.find(m=>(m.text||'').includes('API curl'));console.log(hit?hit.text:'')" 2>/dev/null)
echo "  mensaje encontrado: ${FOUND:0:60}"
[ -n "$FOUND" ] && ok "beto ve el mensaje de ana" || bad "mensaje no visible para beto"

# ── 7. markRead ───────────────────────────────
hdr "7. Beto marca como leído"
curl -s -o /dev/null -b "$JB" -X POST "$B/api/chat/conversations/$CID/read"
UNREAD2=$(curl -s -b "$JB" "$B/api/chat/conversations" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const c=(d.find?d:[]).find(x=>x.id==='$CID');console.log(c?c.unreadCount:'NO_CONVO')" 2>/dev/null)
[ "$UNREAD2" = "0" ] && ok "unreadCount=0 tras markRead" || bad "unreadCount tras leer = $UNREAD2"

# ── 8. validación de texto largo ──────────────
hdr "8. Validación: texto > 4000 chars (esperado 400)"
LONG=$(node -e "console.log('x'.repeat(4100))")
C8=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" \
  -H 'content-type: application/json' -d "{\"kind\":\"TEXT\",\"text\":\"$LONG\"}")
[ "$C8" = "400" ] && ok "texto de 4100 chars rechazado (400)" || bad "texto largo → $C8"

# ── 9. bloqueo bidireccional ──────────────────
hdr "9. Beto bloquea a ana (esperado 403 para ana)"
curl -s -o /dev/null -b "$JB" -X POST "$B/api/chat/block" -H 'content-type: application/json' -d "{\"userId\":\"$ANA_ID\"}"
C9=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" \
  -H 'content-type: application/json' -d '{"kind":"TEXT","text":"¿sigues ahí?"}')
[ "$C9" = "403" ] && ok "ana bloqueada no puede enviar (403)" || bad "mensaje tras bloqueo → $C9"

hdr "10. Beto desbloquea (ana vuelve a poder enviar)"
curl -s -o /dev/null -b "$JB" -X DELETE "$B/api/chat/block" -H 'content-type: application/json' -d "{\"userId\":\"$ANA_ID\"}"
C10=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" \
  -H 'content-type: application/json' -d '{"kind":"TEXT","text":"Bloqueo levantado, todo bien"}')
[ "$C10" = "200" ] || [ "$C10" = "201" ] && ok "tras desbloquear → HTTP $C10" || bad "tras desbloquear → $C10"

# ── resumen ───────────────────────────────────
echo
echo "======================================="
echo "RESULTADO API: $PASS PASS / $FAIL FAIL"
echo "======================================="
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
