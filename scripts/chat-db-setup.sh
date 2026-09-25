#!/usr/bin/env bash
# chat-db-setup.sh — aplica el esquema (incl. 5 tablas de chat) a la PG embebida
# y verifica tablas + genera el cliente Prisma. Uso: bash scripts/preview-run.sh bash scripts/chat-db-setup.sh
cd "$(dirname "$0")/.."
LOG=/tmp/chat-db-setup.log
: > "$LOG"

{
  echo "== prisma generate =="
  bunx prisma generate 2>&1 | tail -3
  echo "== prisma db push =="
  bunx prisma db push --accept-data-loss 2>&1 | tail -6
  echo "== verificación de tablas chat =="
  cat > /tmp/verify-chat-tables.cjs <<'EOF'
const { Client } = require('/home/z/preview-pg/node_modules/pg');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const tables = ['Conversation', 'Participant', 'Message', 'BlockedUser', 'ChatReport'];
  const r = await c.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1) ORDER BY 1`,
    [tables]
  );
  console.log('Tablas chat en PG:', r.rows.map((x) => x.table_name).join(', ') || 'NINGUNA');
  const missing = tables.filter((t) => !r.rows.find((x) => x.table_name === t));
  if (missing.length) { console.log('FALTAN:', missing.join(', ')); process.exitCode = 2; }
  else { console.log('OK: 5/5 tablas de chat presentes'); }
  try {
    const u = await c.query('SELECT count(*)::int AS n FROM "User"');
    console.log('Usuarios existentes:', u.rows[0].n);
    const b = await c.query('SELECT count(*)::int AS n FROM "Business"');
    console.log('Negocios existentes:', b.rows[0].n);
  } catch (e) { console.log('Sondeo User/Business:', e.message.split('\n')[0]); }
  await c.end();
})().catch((e) => { console.error('VERIFY ERROR:', e.message); process.exit(1); });
EOF
  node /tmp/verify-chat-tables.cjs
  echo "== FIN =="
} >> "$LOG" 2>&1

cat "$LOG"
