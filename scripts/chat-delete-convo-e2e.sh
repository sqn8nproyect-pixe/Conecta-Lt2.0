#!/usr/bin/env bash
# chat-delete-convo-e2e.sh — E2E de "eliminar conversación" (correr
# DENTRO de preview-run.sh: bash scripts/preview-run.sh bash scripts/chat-delete-convo-e2e.sh).
# Cubre: permisos (401/403/404), self-delete (sale de MI bandeja, la del otro intacta,
# mensajes persisten), reaparición por mensaje nuevo y por re-apertura, moderación
# 'everyone' (sale para ambos), idempotencia.
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

B=http://localhost:3000
JA=/tmp/jar-ca.txt; JB=/tmp/jar-cb.txt; JC=/tmp/jar-cc.txt
rm -f "$JA" "$JB" "$JC"
PASS=0; FAIL=0
hdr() { echo; echo "== $1 =="; }
ok()  { PASS=$((PASS+1)); echo "PASS: $1"; }
bad() { FAIL=$((FAIL+1)); echo "FAIL: $1"; }

jget() { node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8'));try{const v=Function('d','return d'+process.argv[1].replace(/^\.\[/,'['))(d);console.log(v===undefined||v===null?'':(typeof v==='object'?JSON.stringify(v):v))}catch(e){console.log('')}" "$1" 2>/dev/null; }

# 1) sincronizar schema local y validar la migración LITERAL sobre PG real
bunx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -1
node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
const fs = require('fs');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query('ALTER TABLE "Participant" DROP COLUMN IF EXISTS "deletedAt", DROP COLUMN IF EXISTS "deletedBy"');
  const sql = fs.readFileSync('prisma/migrations/20260926130000_conversation_delete/migration.sql', 'utf8');
  await c.query(sql);
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='Participant' AND column_name IN ('deletedAt','deletedBy') ORDER BY 1");
  console.log(`migración nueva validada sobre PG real → ${r.rows.map((x) => x.column_name).join(', ')}`);
  await c.end();
})().catch((e) => { console.error('VALIDACIÓN MIGRACIÓN:', e.message); process.exit(1); });
EOF

# 2) escenario limpio + usuarios; ana promovida a MODERATOR ANTES del login
#    (el rol viaja en el JWT: se fija al iniciar sesión, no después)
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
bun scripts/seed-chat-test.ts 2>&1 | tail -1
# ana → MODERATOR en DB; + dueño allowlist (sqn8nproyect@gmail.com) con
# role MODERATOR en DB para verificar que la allowlist manda (jwt → ADMIN).
node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query("UPDATE \"User\" SET role='MODERATOR' WHERE email='ana@test.local'");
  await c.query(`INSERT INTO "User" (id, email, name, role, "emailVerified", "createdAt", "updatedAt")
    VALUES (md5(random()::text), 'sqn8nproyect@gmail.com', 'Owner Local', 'MODERATOR', now(), now(), now())
    ON CONFLICT (email) DO UPDATE SET role='MODERATOR'`);
  const r = await c.query("SELECT email, role FROM \"User\" WHERE email LIKE '%test.local' OR email LIKE '%gmail%' ORDER BY email");
  console.log('roles:', r.rows.map((x) => `${x.email}=${x.role}`).join(', '));
  await c.end();
})().catch((e) => { console.error('PROMO:', e.message); process.exit(1); });
EOF

# liberar :3000 si un next-server huérfano quedó vivo (EADDRINUSE)
lsof -t -i :3000 2>/dev/null | xargs -r kill -9 2>/dev/null || true
sleep 1

bun run dev >/tmp/dev-convo-delete-test.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT

# matar este dev al salir TAMBIÉN por puerto (un next-server huérfano
# bloquearía el siguiente run con EADDRINUSE)
trap 'kill $DEV_PID 2>/dev/null; lsof -t -i :3000 2>/dev/null | xargs -r kill -9 2>/dev/null; true' EXIT

for i in $(seq 1 60); do
  curl -s -o /dev/null "http://localhost:3000/" 2>/dev/null && break
  sleep 1
done
curl -s -o /dev/null "http://localhost:3000/" || { echo "dev no arrancó"; tail -25 /tmp/dev-convo-delete-test.log; exit 1; }
echo "dev listo (:3000)"

login_demo() {
  local JAR=$1 EMAIL=$2 CSRF CODE
  CSRF=$(curl -s -c "$JAR" "$B/api/auth/csrf" | jget .csrfToken)
  [ -n "$CSRF" ] || { echo "sin csrf para $EMAIL"; return 1; }
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JAR" -c "$JAR" -X POST "$B/api/auth/callback/demo" \
    -d "csrfToken=$CSRF" -d "email=$EMAIL" -d "callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F" -d "json=true")
  [ "$CODE" = "200" ] || [ "$CODE" = "302" ] || { echo "login $EMAIL falló ($CODE)"; return 1; }
}

# inbox_has JAR CID → exit 0 si la conversación CID aparece en la bandeja
inbox_has() {
  curl -s -b "$1" "$B/api/chat/conversations" | rg -q "\"id\":\"$2\""
}

hdr "1. Sesiones demo (owner=ADMIN via allowlist, ana/beto=USER)"
login_demo "$JA" "ana@test.local"  && ok "sesión ana"  || bad "sesión ana"
login_demo "$JB" "beto@test.local" && ok "sesión beto" || bad "sesión beto"
login_demo "$JC" "sqn8nproyect@gmail.com" && ok "sesión owner (allowlist)" || bad "sesión owner"
ROLE=$(curl -s -b "$JC" "$B/api/auth/session" | jget '.user.role')
[ "$ROLE" = "ADMIN" ] && ok "owner session role=ADMIN (allowlist gana a DB)" || bad "owner role=$ROLE"
ROLE_ANA=$(curl -s -b "$JA" "$B/api/auth/session" | jget '.user.role')
[ "$ROLE_ANA" = "USER" ] && ok "ana session role=USER (MODERATOR en DB sin allowlist → stripped)" || bad "ana role=$ROLE_ANA"

BETO_ID=$(curl -s -b "$JA" "$B/api/chat/users?q=beto" | jget '.[0].id')
ANA_ID=$(curl -s -b "$JA" "$B/api/auth/session" | jget '.user.id')
hdr "2. Preparar conversación + mensajes"
CONV=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}")
CID=$(echo "$CONV" | jget .id)
[ -n "$CID" ] && ok "conversación $CID" || bad "conversación"
M1=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"hola beto"}' | jget .id)
[ -n "$M1" ] && ok "mensaje creado" || bad "mensaje"

# conversación "ajena": participante SOLO ana (insert directo, para 404 de no-participante)
CID_AJENA=$(node << 'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const ana = (await c.query("SELECT id FROM \"User\" WHERE email='ana@test.local'")).rows[0].id;
  const conv = (await c.query("INSERT INTO \"Conversation\" (id, type, \"createdBy\", \"lastMessageAt\", \"createdAt\", \"updatedAt\") VALUES (md5(random()::text), 'DIRECT', $1, now(), now(), now()) RETURNING id", [ana])).rows[0].id;
  await c.query("INSERT INTO \"Participant\" (id, \"conversationId\", \"userId\") VALUES (md5(random()::text), $1, $2)", [conv, ana]);
  console.log(conv);
  await c.end();
})().catch((e) => { console.error('CONV AJENA:', e.message); process.exit(1); });
EOF
)

hdr "3. Permisos"
C=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$B/api/chat/conversations/$CID")
[ "$C" = "401" ] && ok "anónimo DELETE → 401" || bad "anónimo DELETE → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID" -H 'content-type: application/json' -d '{"scope":"everyone"}')
[ "$C" = "403" ] && ok "beto (USER) scope everyone → 403" || bad "beto everyone → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X DELETE "$B/api/chat/conversations/$CID" -H 'content-type: application/json' -d '{"scope":"everyone"}')
[ "$C" = "403" ] && ok "ana (MODERATOR en DB, sin allowlist) scope everyone → 403" || bad "ana everyone → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID_AJENA")
[ "$C" = "404" ] && ok "beto no-participante (self) → 404" || bad "no-participante → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/noexiste")
[ "$C" = "404" ] && ok "conversación inexistente → 404" || bad "inexistente → $C"

hdr "4. Self-delete de beto (solo su bandeja)"
DEL=$(curl -s -b "$JB" -X DELETE "$B/api/chat/conversations/$CID" -H 'content-type: application/json' -d '{"scope":"self"}')
S=$(echo "$DEL" | jget .scope)
[ "$S" = "self" ] && ok "DELETE beto → 200 scope=self" || bad "DELETE beto: $DEL"

inbox_has "$JB" "$CID" && bad "beto aún la ve en su bandeja" || ok "conversación FUERA de la bandeja de beto"
inbox_has "$JA" "$CID" && ok "ana la conserva intacta" || bad "ana la perdió (¡mal!)"

SEE=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" "$B/api/chat/conversations/$CID/messages")
[ "$SEE" = "200" ] && ok "soft: mensajes persisten (GET 200 para beto)" || bad "GET mensajes tras delete → $SEE"

hdr "5. Reaparición por mensaje nuevo"
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID" -H 'content-type: application/json' -d '{"scope":"self"}')
[ "$C" = "200" ] && ok "re-delete idempotente → 200" || bad "re-delete → $C"
curl -s -o /dev/null -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"otra vez por aqui"}'
inbox_has "$JB" "$CID" && ok "mensaje nuevo de ana → reaparece en bandeja de beto" || bad "NO reapareció con mensaje nuevo"

hdr "6. Reaparición por re-apertura explícita"
curl -s -o /dev/null -b "$JB" -X DELETE "$B/api/chat/conversations/$CID" -H 'content-type: application/json' -d '{"scope":"self"}'
inbox_has "$JB" "$CID" && bad "beto aún la ve (pre-reapertura)" || ok "fuera de nuevo tras self-delete"
RE=$(curl -s -b "$JB" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$ANA_ID\"}" | jget .id)
[ "$RE" = "$CID" ] && ok "re-apertura devuelve la MISMA conversación" || bad "re-apertura: $RE vs $CID"
inbox_has "$JB" "$CID" && ok "re-apertura → reaparece en bandeja de beto" || bad "re-apertura no la devolvió a la bandeja"

hdr "7. Moderación: owner (ADMIN allowlist) elimina para TODOS"
DEL=$(curl -s -b "$JC" -X DELETE "$B/api/chat/conversations/$CID" -H 'content-type: application/json' -d '{"scope":"everyone"}')
S=$(echo "$DEL" | jget .scope)
[ "$S" = "everyone" ] && ok "DELETE owner → 200 scope=everyone" || bad "DELETE everyone: $DEL"
inbox_has "$JA" "$CID" && bad "ana aún la ve" || ok "fuera de la bandeja de ana"
inbox_has "$JB" "$CID" && bad "beto aún la ve" || ok "fuera de la bandeja de beto"

hdr "8. Reaparición tras everyone (mensaje nuevo)"
curl -s -o /dev/null -b "$JA" -X POST "$B/api/chat/conversations/$CID/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"revivimos"}'
inbox_has "$JA" "$CID" && ok "ana vuelve a verla" || bad "ana no la ve"
inbox_has "$JB" "$CID" && ok "beto vuelve a verla" || bad "beto no la ve"

hdr "9. La conversación ajena de ana no se tocó"
inbox_has "$JA" "$CID_AJENA" && ok "conversación ajena intacta" || bad "conversación ajena desapareció"

echo
echo "RESULTADO: $PASS PASS / $FAIL FAIL"
[ "$FAIL" = "0" ]
