#!/usr/bin/env bash
# rebuild-preview-pg.sh — reconstruye la PG embebida de /home/z/preview-pg
# (el sandbox restore la borra; este script la deja lista otra vez).
# Idempotente: si ya existe node_modules, solo re-verifica.
set -euo pipefail
DIR=/home/z/preview-pg
mkdir -p "$DIR"
cd "$DIR"

if [ ! -d node_modules/embedded-postgres ]; then
  [ -f package.json ] || echo '{"name":"preview-pg","private":true}' > package.json
  bun add embedded-postgres pg >/tmp/pg-install.log 2>&1 || { tail -20 /tmp/pg-install.log; exit 1; }
  bun pm trust --all >>/tmp/pg-install.log 2>&1 || true
  echo "deps instaladas"
else
  echo "deps ya presentes"
fi

# GOTCHA v18-beta: exporta .default
cat > start-pg.js << 'EOF'
const EmbeddedPostgres = require('embedded-postgres').default;
const fs = require('fs');

(async () => {
  const pg = new EmbeddedPostgres({
    databaseDir: '/home/z/preview-pg/data',
    user: 'postgres',
    password: 'postgres',
    port: 5433,
    persistent: true,
  });
  if (!fs.existsSync('/home/z/preview-pg/data/PG_VERSION')) {
    await pg.initialise();
  }
  await pg.start();
  try { await pg.createDatabase('conectalt'); } catch (_) { /* ya existe */ }
  console.log('PG lista en 127.0.0.1:5433');
  setInterval(() => {}, 1 << 30); // mantener vivo en primer plano
})().catch((e) => { console.error('PG ERROR:', e); process.exit(1); });
EOF

# .env del proyecto: PG local + AUTH_SECRET de dev (gitignored)
cd /home/z/my-project
if ! rg -q "5433" .env 2>/dev/null; then
  SECRET=$(openssl rand -base64 32)
  cat > .env << EOF
# .env SOLO para preview local (PG embebida 127.0.0.1:5433) — gitignored
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5433/conectalt
DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:5433/conectalt
AUTH_SECRET=${SECRET}
EOF
  echo ".env reconstruido (PG local + AUTH_SECRET dev)"
else
  echo ".env ya apunta a la PG local"
fi
echo "preview-pg listo"
