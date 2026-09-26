#!/usr/bin/env bash
# rotate-auth-secret.sh — rota el secret de sesión (Auth.js) en Vercel de una vez.
# Uso: VERCEL_TOKEN=xxx bash scripts/rotate-auth-secret.sh
# Pasos: genera secret nuevo (nunca se imprime ni persiste) → upsert AUTH_SECRET
# + NEXTAUTH_SECRET (production+preview) → redeploy de producción (gitSource main)
# → espera READY → verificación (home, session endpoint, login demo opcional).
set -euo pipefail

: "${VERCEL_TOKEN:?Falta VERCEL_TOKEN}"
API=https://api.vercel.com
PRJ=prj_yZ81u5SXdIvXpsngw0cEHrVMxclH
PRJ_NAME=conecta-lt2-0

# ── 1. Nuevo secret (solo vive en esta variable de shell) ──
SECRET=$(openssl rand -base64 32)
[ ${#SECRET} -ge 40 ] || { echo "ERROR: secret generado demasiado corto"; exit 1; }
echo "1. secret nuevo generado (${#SECRET} chars, valor NO mostrado)"

# ── 2. Upsert de las dos variables ──
set_var() { # <key> <value>
  curl -s -o /tmp/ra-env.json -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    "$API/v10/projects/$PRJ/env?upsert=true" \
    -d "{\"key\":\"$1\",\"value\":\"$2\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}"
}
echo "2. subiendo variables..."
for K in AUTH_SECRET NEXTAUTH_SECRET; do
  CODE=$(set_var "$K" "$SECRET")
  case "$CODE" in
    200|201) echo "   ✓ $K actualizada" ;;
    *) echo "   ✗ $K → HTTP $CODE: $(head -c 300 /tmp/ra-env.json)"; exit 1 ;;
  esac
done

# ── 3. Redeploy de producción ──
echo "3. lanzando redeploy..."
DEPLOY=$(curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  "$API/v13/deployments" \
  -d "{\"name\":\"$PRJ_NAME\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"org\":\"sqn8nproyect-pixe\",\"repo\":\"Conecta-Lt2.0\",\"ref\":\"main\"}}")
DID=$(node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).id||'')}catch(e){console.log('')}})" <<<"$DEPLOY")
[ -n "$DID" ] || { echo "ERROR deploy: $(echo "$DEPLOY" | head -c 400)"; exit 1; }
echo "   deployment: $DID"

# ── 4. Esperar READY (máx ~8 min) ──
echo "4. esperando build..."
for i in $(seq 1 24); do
  sleep 20
  RS=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API/v13/deployments/$DID" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).readyState)}catch(e){console.log('?')}})")
  echo "   [$i] readyState=$RS"
  case "$RS" in
    READY) break ;;
    ERROR|CANCELED)
      echo "   BUILD FALLÓ — últimas líneas del log:"
      curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API/v2/deployments/$DID/events?limit=100&builds=1" \
        | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const e=JSON.parse(s).events||[];e.slice(-40).forEach(x=>{const t=(x.payload||{}).text||'';if(t)console.log('   '+t.trimEnd())})}catch(err){}})"
      exit 2 ;;
  esac
done
[ "$RS" = "READY" ] || { echo "TIMEOUT — re-verificar a mano"; exit 3; }

# ── 5. Verificación ──
echo "5. verificación en https://conectalt.com ..."
C_HOME=$(curl -s -o /dev/null -w "%{http_code}" https://conectalt.com/)
echo "   home → $C_HOME (esperado 200)"
C_SESS=$(curl -s -o /tmp/ra-sess.json -w "%{http_code}" https://conectalt.com/api/auth/session)
echo "   /api/auth/session → $C_SESS body=$(head -c 60 /tmp/ra-sess.json)"

# login demo (si el proveedor demo y los usuarios existen en prod)
JA=/tmp/jar-rot.txt; rm -f "$JA"
CSRF=$(curl -s -c "$JA" https://conectalt.com/api/auth/csrf | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).csrfToken)}catch(e){console.log('')}})" 2>/dev/null || true)
if [ -n "$CSRF" ]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -c "$JA" -X POST https://conectalt.com/api/auth/callback/demo \
    -d "csrfToken=$CSRF" -d "email=ana@test.local" -d "callbackUrl=https%3A%2F%2Fconectalt.com%2F" -d "json=true")
  echo "   login demo ana → HTTP $CODE"
  if [ "$CODE" = "200" ] || [ "$CODE" = "302" ]; then
    SESS=$(curl -s -b "$JA" https://conectalt.com/api/auth/session | head -c 200)
    echo "   sesión emitida: $SESS"
    echo "$SESS" | rg -q '"user"' && echo "   ✓✓ SECRET NUEVO VERIFICADO: emite sesiones reales" \
      || echo "   (login 200 pero sin user JSON — revisar; posible sin usuarios demo en prod)"
  fi
else
  echo "   (sin csrf — omito login demo)"
fi

echo
echo "ROTACIÓN COMPLETA. Efecto: todas las sesiones anteriores quedaron invalidadas (re-login general)."
