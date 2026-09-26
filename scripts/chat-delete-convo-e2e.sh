#!/usr/bin/env bash
# chat-delete-convo-e2e.sh — E2E de "eliminar conversación" v2 (correr
# DENTRO de preview-run.sh: bash scripts/preview-run.sh bash scripts/chat-delete-convo-e2e.sh).
# Semántica v2 — ELIMINACIÓN TOTAL: al eliminar, la conversación
# desaparece de la bandeja de AMBOS, los mensajes se PURGAN (sin
# tumbas), NADA reaparece (ni por mensaje nuevo ni por re-apertura:
# un chat nuevo crea una conversación NUEVA y vacía), y la fila se
# borra salvo que tenga reportes (evidencia de moderación = cáscara
# sin participantes). Moderación (ADMIN/MODERATOR) puede eliminar
# conversaciones ajenas.
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

# dbcount TABLA COLUMNA VALOR → imprime el número de filas
dbcount() {
  node << EOF
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query('SELECT count(*)::int AS n FROM "$1" WHERE "$2" = \$1::text', ['$3']);
  console.log(r.rows[0].n);
  await c.end();
})().catch((e) => { console.error('DBCOUNT:', e.message); process.exit(1); });
EOF
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
[ -n "$M1" ] && ok "mensaje 1 (ana)" || bad "mensaje 1"
M2=$(curl -s -b "$JB" -X POST "$B/api/chat/conversations/$CID/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"que tal ana"}' | jget .id)
[ -n "$M2" ] && ok "mensaje 2 (beto)" || bad "mensaje 2"

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

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID_AJENA")
[ "$C" = "404" ] && ok "beto no-participante → 404 (no revelación)" || bad "no-participante → $C"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/noexiste")
[ "$C" = "404" ] && ok "conversación inexistente → 404" || bad "inexistente → $C"

hdr "4. Eliminación TOTAL por participante (beto borra → sale para AMBOS)"
DEL=$(curl -s -b "$JB" -X DELETE "$B/api/chat/conversations/$CID")
OKF=$(echo "$DEL" | jget .ok)
[ "$OKF" = "true" ] && ok "DELETE beto → 200 ok=true" || bad "DELETE beto: $DEL"

inbox_has "$JB" "$CID" && bad "beto aún la ve en su bandeja" || ok "fuera de la bandeja de beto"
inbox_has "$JA" "$CID" && bad "ana TODAVÍA la ve (debió salir también)" || ok "fuera de la bandeja de ana (sale para ambos)"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" "$B/api/chat/conversations/$CID/messages")
[ "$C" = "404" ] && ok "GET mensajes beto → 404 (conversación inexistente)" || bad "GET mensajes beto → $C"
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" "$B/api/chat/conversations/$CID/messages")
[ "$C" = "404" ] && ok "GET mensajes ana → 404" || bad "GET mensajes ana → $C"

NM=$(dbcount Message conversationId "$CID"); [ "$NM" = "0" ] && ok "MENSAJES PURGADOS de la BD (0 filas)" || bad "mensajes en BD: $NM"
NP=$(dbcount Participant conversationId "$CID"); [ "$NP" = "0" ] && ok "PARTICIPANTES fuera (0 filas)" || bad "participantes en BD: $NP"
NC=$(dbcount Conversation id "$CID"); [ "$NC" = "0" ] && ok "FILA de conversación eliminada (0 filas)" || bad "conversación en BD: $NC"

C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JB" -X DELETE "$B/api/chat/conversations/$CID")
[ "$C" = "404" ] && ok "re-DELETE → 404 (ya no existe; sin idempotencia falsa)" || bad "re-DELETE → $C"

hdr "5. Chat nuevo ana↔beto = conversación NUEVA y VACÍA (sin historial)"
CID2=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}" | jget .id)
[ -n "$CID2" ] && [ "$CID2" != "$CID" ] && ok "nueva conversación $CID2 (ID distinto del eliminado)" || bad "re-apertura: $CID2 vs $CID"
HIST=$(curl -s -b "$JB" "$B/api/chat/conversations/$CID2/messages" | jget '.messages.length' 2>/dev/null)
[ "$HIST" = "0" ] && ok "SIN historial: 0 mensajes (lo viejo NO vuelve)" || bad "historial: $HIST"
inbox_has "$JA" "$CID2" && ok "aparece en bandeja de ana" || bad "ana no la ve"
inbox_has "$JB" "$CID2" && ok "aparece en bandeja de beto" || bad "beto no la ve"

hdr "6. Moderación: owner (ADMIN, NO participante) elimina CID2 para siempre"
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JC" -X DELETE "$B/api/chat/conversations/$CID2")
[ "$C" = "200" ] && ok "DELETE owner (no participante) → 200" || bad "DELETE owner → $C"
inbox_has "$JA" "$CID2" && bad "ana aún la ve" || ok "fuera de la bandeja de ana"
inbox_has "$JB" "$CID2" && bad "beto aún la ve" || ok "fuera de la bandeja de beto"
NM2=$(dbcount Message conversationId "$CID2"); [ "$NM2" = "0" ] && ok "mensajes de CID2 purgados" || bad "mensajes CID2: $NM2"

hdr "7. Reporte previo ⇒ queda cáscara (evidencia de moderación), sin historial"
CID3=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}" | jget .id)
curl -s -o /dev/null -b "$JA" -X POST "$B/api/chat/conversations/$CID3/messages" -H 'content-type: application/json' -d '{"kind":"TEXT","text":"voy a reportar esto"}'
REP=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X POST "$B/api/chat/conversations/$CID3/report" -H 'content-type: application/json' -d '{"reason":"OTRO","details":"prueba e2e"}')
[ "$REP" = "200" ] && ok "reporte creado sobre CID3" || bad "reporte → $REP"
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" -X DELETE "$B/api/chat/conversations/$CID3")
[ "$C" = "200" ] && ok "ana elimina CID3 (con reporte) → 200" || bad "DELETE CID3 → $C"
NR=$(dbcount ChatReport conversationId "$CID3"); [ "$NR" = "1" ] && ok "REPORTE conservado (evidencia para moderación)" || bad "reportes: $NR"
NM3=$(dbcount Message conversationId "$CID3"); [ "$NM3" = "0" ] && ok "mensajes de CID3 purgados igualmente" || bad "mensajes CID3: $NM3"
NC3=$(dbcount Conversation id "$CID3"); [ "$NC3" = "1" ] && ok "cáscara sin participantes (invisible en bandejas)" || bad "cáscara: $NC3"
NP3=$(dbcount Participant conversationId "$CID3"); [ "$NP3" = "0" ] && ok "0 participantes en la cáscara" || bad "participantes cáscara: $NP3"
C=$(curl -s -o /dev/null -w "%{http_code}" -b "$JA" "$B/api/chat/conversations/$CID3/messages")
[ "$C" = "404" ] && ok "cáscara inabrable: GET mensajes → 404" || bad "GET mensajes cáscara → $C"
CID4=$(curl -s -b "$JA" -X POST "$B/api/chat/conversations" -H 'content-type: application/json' -d "{\"userId\":\"$BETO_ID\"}" | jget .id)
[ -n "$CID4" ] && [ "$CID4" != "$CID3" ] && ok "chat nuevo tras cáscara → conversación fresca $CID4" || bad "re-uso de cáscara: $CID4"

hdr "8. La conversación ajena de ana no se tocó"
inbox_has "$JA" "$CID_AJENA" && ok "conversación ajena intacta" || bad "conversación ajena desapareció"

echo
echo "RESULTADO: $PASS PASS / $FAIL FAIL"
[ "$FAIL" = "0" ]
