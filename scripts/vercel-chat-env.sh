#!/usr/bin/env bash
# vercel-chat-env.sh — activa Pusher en Vercel de una sola vez.
# Uso (valores por env vars, NUNCA hardcodear el token):
#   VERCEL_TOKEN=xxx PUSHER_APP_ID=a PUSHER_KEY=b PUSHER_SECRET=c PUSHER_CLUSTER=us2 \
#     bash scripts/vercel-chat-env.sh
# Hace:
#   1. Valida el token y localiza el proyecto
#   2. Valida las credenciales Pusher con un trigger real de prueba
#   3. Crea las 6 env vars (Production)
#   4. Dispara un redeploy de producción desde main
#   5. Imprime URLs para verificar
set -euo pipefail

: "${VERCEL_TOKEN:?Falta VERCEL_TOKEN}"
: "${PUSHER_APP_ID:?Falta PUSHER_APP_ID}"
: "${PUSHER_KEY:?Falta PUSHER_KEY}"
: "${PUSHER_SECRET:?Falta PUSHER_SECRET}"
: "${PUSHER_CLUSTER:?Falta PUSHER_CLUSTER (ej: us2)}"

API=https://api.vercel.com
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(eval(process.argv[1])??'')})" "$1"; }

echo "== 1. Token + proyecto =="
# Tokens de team dan 404 en /v2/user; /v9/projects funciona para ambos casos.
PROJECTS=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "$API/v9/projects?limit=20")
echo "$PROJECTS" | rg -q '"projects"' || { echo "ERROR: token sin acceso a proyectos: $(echo "$PROJECTS" | head -c 300)"; exit 1; }
echo "  token: acceso a proyectos ✓"
echo "$PROJECTS" > /tmp/vercel-projects.json
PROJECT=$(node -e "
  const j=JSON.parse(require('fs').readFileSync('/tmp/vercel-projects.json','utf8'));
  const p=(j.projects||[]).find(p=>/conecta/i.test(p.name)||/conecta/i.test(p.framework||''));
  if(!p){console.log('');process.exit(0)};console.log(p.id+'|'+p.name)" )
[ -n "$PROJECT" ] || { echo "ERROR: no encontré proyecto con nombre tipo 'conecta'"; echo "$PROJECTS" | head -c 400; exit 1; }
PRJ_ID="${PROJECT%%|*}"; PRJ_NAME="${PROJECT##*|}"
echo "  proyecto: $PRJ_NAME ($PRJ_ID)"

echo "== 2. Validación Pusher (trigger de prueba) =="
node -e "
  const Pusher=require('pusher');
  const p=new Pusher({appId:process.env.PUSHER_APP_ID,key:process.env.PUSHER_KEY,secret:process.env.PUSHER_SECRET,cluster:process.env.PUSHER_CLUSTER,useTLS:true});
  p.trigger('test-conectalt','ping',{ok:true,ts:Date.now()})
   .then(r=>{console.log('  ✓ evento de prueba aceptado por Pusher (channels:',(r.channels&&Object.keys(r.channels).length)||'?')})
   .catch(e=>{console.error('  ✗ Pusher rechazó las credenciales:',e.message||e);process.exit(1)});
"

echo "== 3. Crear 6 env vars (Production) =="
create_env() { # <key> <value>  (target fijo: production + preview)
  curl -s -o /tmp/env-resp.json -w "%{http_code}" -X POST \
    -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
    "$API/v10/projects/$PRJ_ID/env?upsert=true" \
    -d "{\"key\":\"$1\",\"value\":\"$2\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}"
}
declare -A VARS=(
  [PUSHER_APP_ID]="$PUSHER_APP_ID"
  [PUSHER_KEY]="$PUSHER_KEY"
  [PUSHER_SECRET]="$PUSHER_SECRET"
  [PUSHER_CLUSTER]="$PUSHER_CLUSTER"
  [NEXT_PUBLIC_PUSHER_KEY]="$PUSHER_KEY"
  [NEXT_PUBLIC_PUSHER_CLUSTER]="$PUSHER_CLUSTER"
)
FAIL=0
for K in PUSHER_APP_ID PUSHER_KEY PUSHER_SECRET PUSHER_CLUSTER NEXT_PUBLIC_PUSHER_KEY NEXT_PUBLIC_PUSHER_CLUSTER; do
  CODE=$(create_env "$K" "${VARS[$K]}")
  # 200/201 = creada/actualizada OK (upsert=true)
  case "$CODE" in
    200|201) echo "  ✓ $K" ;;
    *) echo "  ✗ $K → HTTP $CODE: $(head -c 200 /tmp/env-resp.json)"; FAIL=1 ;;
  esac
done
[ "$FAIL" = "0" ] || exit 1

echo "== 4. Redeploy de producción (main) =="
# gitSource del último commit en main del repo conectado
DEPLOY=$(curl -s -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  "$API/v13/deployments" \
  -d "{\"name\":\"$PRJ_NAME\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"org\":\"sqn8nproyect-pixe\",\"repo\":\"Conecta-Lt2.0\",\"ref\":\"main\"}}")
echo "$DEPLOY" > /tmp/vercel-deploy.json
DEPLOY_URL=$(node -e "const j=JSON.parse(require('fs').readFileSync('/tmp/vercel-deploy.json','utf8'));console.log(j.url||j.error?.message||'')")
echo "  deployment: $DEPLOY_URL"
echo
echo "LISTO. Verifica en ~3-4 min: https://conectalt.com — chat con entrega instantánea."
