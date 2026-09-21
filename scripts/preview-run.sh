#!/usr/bin/env bash
# preview-run.sh — Preview local sin Neon: levanta la PG embebida 127.0.0.1:5433,
# ejecuta el comando dado (o verificación por defecto) y apaga todo al salir.
# Uso: bash scripts/preview-run.sh [comando...]   (p.ej.: bun run dev -- --port 3000)
# GOTCHA: todo en UNA llamada bash — el sandbox mata procesos background entre tool calls.
set -e
cd "$(dirname "$0")/.."

unset DATABASE_URL DIRECT_URL
set -a; [ -f .env ] && . ./.env; set +a

node /home/z/preview-pg/start-pg.js >/tmp/pg-preview.log 2>&1 &
PG_PID=$!
trap 'kill $PG_PID 2>/dev/null || true' EXIT

# esperar puerto 5433 (máx 30s)
for i in $(seq 1 30); do
  (exec 3<>/dev/tcp/127.0.0.1/5433) 2>/dev/null && { exec 3>&-; break; }
  sleep 1
done
grep -q "lista en 127.0.0.1:5433" /tmp/pg-preview.log || { cat /tmp/pg-preview.log; echo "ERROR: PG no arrancó"; exit 1; }
echo "PG embebida activa (pid $PG_PID)"

if [ "$#" -eq 0 ]; then
  # verificación por defecto: esquema + conteo de negocios
  bunx prisma db push --skip-generate --accept-data-loss 2>&1 | tail -2
  node -e "
    const {Client}=require('/home/z/preview-pg/node_modules/pg');
    (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();
    const r=await c.query('SELECT count(*)::int AS negocios FROM \"Business\"').catch(e=>({rows:[{negocios:'sin tabla: '+e.message.split('\n')[0]}]}));
    console.log('Business en PG local:',r.rows[0].negocios);await c.end();})();
  "
  echo "Preview listo. Arranca el server con el comando que necesites (en esta misma llamada)."
else
  "$@"
fi
