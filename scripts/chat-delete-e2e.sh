#!/usr/bin/env bash
# chat-delete-e2e.sh — E2E del borrado de mensajes (correr DENTRO de
# preview-run.sh: `bash scripts/preview-run.sh bash scripts/chat-delete-e2e.sh`).
# Cubre: permisos (403/404/401), soft-delete del autor (200 + redacción),
# idempotencia, tumba visible para el otro, preview de bandeja redactado.
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

B=http://localhost:3000
JA=/tmp/jar-da.txt; JB=/tmp/jar-db.txt
rm -f "$JA" "$JB"
PASS=0; FAIL=0
hdr() { echo; echo "== $1 =="; }
ok()  { PASS=$((PASS+1)); echo "PASS: $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

jget() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));try{const v=Function('d','return d'+process.argv[1].replace(/^\.\[/,'['))(d);console.log(v===undefined||v===null?'':(typeof v==='object'?JSON.stringify(v):v))}catch(e){console.log('')}" "$1" 2>/dev/null; }

# espera migraciones + seed ya hechos por el llamador; levanta dev
# Local: db push sincroniza TODO el schema (el auto-DDL de Neon no existe
# aquí). Luego se valida LITERALMENTE el SQL de la migración nueva, tal
# cual lo ejecutará `prisma migrate deploy` en producción.
bunx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -1
node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
const fs = require('fs');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Validar la migración literal SIN destruir datos: como DROP COLUMN
  // borra los valores, preservo deletedAt/deletedBy y los restauro luego.
  const saved = (await c.query('SELECT id, "deletedAt", "deletedBy" FROM "Message" WHERE "deletedAt" IS NOT NULL')).rows;
  await c.query('ALTER TABLE "Message" DROP COLUMN IF EXISTS "deletedAt", DROP COLUMN IF EXISTS "deletedBy"');
  const sql = fs.readFileSync('prisma/migrations/20260926120000_message_soft_delete/migration.sql', 'utf8');
  await c.query(sql);
  for (const row of saved) {
    await c.query('UPDATE "Message" SET "deletedAt" = $1, "deletedBy" = $2 WHERE id = $3', [row.deletedAt, row.deletedBy, row.id]);
  }
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='Message' AND column_name IN ('deletedAt','deletedBy') ORDER BY 1");
  console.log(`migración nueva validada sobre PG real → ${r.rows.map((x) => x.column_name).join(', ')} (${saved.length} soft-deletes preservados)`);
  await c.end();
})().catch((e) => { console.error('VALIDACIÓN MIGRACIÓN:', e.message); process.exit(1); });
EOF
# Escenario limpio: solo datos de ESTA corrida (los usuarios demo quedan)
node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('DELETE FROM "Message"');
  await c.query('DELETE FROM "Conversation"');
  await c.end();
})().catch((e) => { console.error('LIMPIEZA:', e.message); process.exit(1); });
EOF
bun scripts/seed-chat-test.ts 2>&1 | tail -2

bun run dev >/tmp/dev-delete-test.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT

for i in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:3000/" 2>/dev/null && break
  sleep 1
done
curl -s -o /dev/null "http://localhost:3000/" || { echo "dev no arrancó"; tail -25 /tmp/dev-delete-test.log; exit 1; }
echo "dev listo (:3000)"

# login demo (Auth.js credentials)
login_demo() {
  local JAR=$1 EMAIL=$2 CSRF CODE
  CSRF=$(curl -s -c "$JAR" "$B/api/auth/csrf" | jget .csrfToken)
  [ -n "$CSRF" ] || { echo "sin csrf para $EMAIL"; return 1; }
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST "$B/api/auth/callback/demo" \
    -d "csrfToken=$CSRF" -d "email=$EMAIL" -d "callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F" -d "json=true")
  [ "$CODE" = "200" ] || [ "$CODE" = "302" ] || { echo "login $EMAIL falló ($CODE)"; return 1; }
}

hdr "1. Sesiones demo"
login_demo "$JA" "ana@test.local"  && ok "sesión ana"  || bad "sesión ana"
login_demo "$JB" "beto@test.local" && ok "sesión beto" || bad "sesión beto"

BETO_ID=$(curl -s -b "$JA" "$B/api/chat/users?q=beto" | jget '.[0].id')
hdr "2. Preparar conversación + mensajes"
CONV=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}")
CID=$(echo "$CONV" | jget .id)
[ -n "$CID" ] && ok "conversación $CID" || bad "conversación"

M1=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"mensaje PARA BORRAR"}' | jget .id)
M2=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"mensaje permanente"}' | jget .id)
[ -n "$M1" ] && [ -n "$M2" ] && ok "mensajes creados ($M1 / $M2)" || bad "creación de mensajes"

hdr "3. Permisos"
C=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$B/api/chat/conversations/$CID/messages/$M1")
[ "$C" = "401" ] && ok "anónimo DELETE → 401" || bad "anónimo DELETE → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID/messages/$M1")
[ "$C" = "403" ] && ok "beto no puede borrar el de ana → 403" || bad "beto borró ajeno → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X DELETE "$B/api/chat/conversations/$CID/messages/noexiste")
[ "$C" = "404" ] && ok "mensaje inexistente → 404" || bad "inexistente → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X DELETE "$B/api/chat/conversations/otraconv/messages/$M1")
[ "$C" = "404" ] && ok "conversación ajena → 404" || bad "conversación ajena → $C"

hdr "4. Soft-delete del autor (ana)"
DEL=$(curl -s -b "$JA" -X DELETE "$B/api/chat/conversations/$CID/messages/$M1")
D=$(echo "$DEL" | jget .deleted); T=$(echo "$DEL" | jget .text)
[ "$D" = "true" ] && ok "DELETE ana → 200 deleted=true" || bad "DELETE ana: $DEL"
[ -z "$T" ] && ok "contenido redactado en la respuesta (text vacío)" || bad "text en respuesta: $T"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X DELETE "$B/api/chat/conversations/$CID/messages/$M1")
[ "$C" = "200" ] && ok "re-DELETE idempotente → 200" || bad "re-DELETE → $C"

hdr "5. Tumba para el otro (beto)"
SEE=$(curl -s -b "$JB" "$B/api/chat/conversations/$CID/messages")
ROW=$(echo "$SEE" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const m=(j.messages||[]).find(x=>x.id==='$M1');console.log(m?JSON.stringify(m):'NO_ESTA')})")
echo "$ROW" | rg -q '"deleted":true' && ok "beto ve la tumba (deleted=true)" || bad "beto ve: $ROW"
echo "$ROW" | rg -q '"text":null' && ok "contenido redactado para beto (text=null)" || bad "beto aún ve texto: $ROW"
echo "$SEE" | rg -q "mensaje PARA BORRAR" && bad "¡el texto sigue filtrándose!" || ok "el texto original NO aparece en ningún lado"
echo "$SEE" | rg -q "mensaje permanente" && ok "el mensaje permanente sigue intacto" || bad "se perdió el mensaje permanente"

hdr "6. Preview de bandeja redactado"
# ana también borra M2 → el último mensaje de la conversación queda
# siendo uno eliminado → la bandeja debe mostrar la tumba redactada.
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X DELETE "$B/api/chat/conversations/$CID/messages/$M2")
[ "$C" = "200" ] && ok "ana borra también M2 → 200" || bad "DELETE M2 → $C"
INBOX=$(curl -s -b "$JB" "$B/api/chat/conversations")
PREV=$(echo "$INBOX" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const list=j.conversations||j;const c=list.find(x=>x.id==='$CID');console.log(c&&c.lastMessage?JSON.stringify(c.lastMessage):'NO')})")
echo "$PREV" | rg -q '"deleted":true' && ok "bandeja de beto: lastMessage deleted=true" || bad "bandeja: $PREV"
echo "$PREV" | rg -q '"text":null' && ok "bandeja: preview sin contenido (text=null)" || bad "bandeja con texto: $PREV"

hdr "7. Moderación: beto (USER) sin role → tumba; ana ve la suya"
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID/messages/$M2")
[ "$C" = "403" ] && ok "beto sigue sin poder borrar ajenos → 403" || bad "beto borró ajeno M2 → $C"

echo
echo "RESULTADO: $PASS PASS / $FAIL FAIL"
[ "$FAIL" = "0" ]
