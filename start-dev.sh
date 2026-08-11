#!/usr/bin/env bash
# start-dev.sh — Arranca el dev server de Next.js con Neon PostgreSQL.
# Garantiza que el env var DATABASE_URL venga de .env (Neon), no del
# override del shell que apunta a SQLite local.
set -e
cd "$(dirname "$0")"

# Limpiar cualquier override del shell que apunte a SQLite
unset DATABASE_URL DIRECT_URL NEXTAUTH_SECRET AUTH_SECRET
unset GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET NEXT_PUBLIC_GOOGLE_CLIENT_ID

# Cargar .env (Neon) respetando comillas
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

# Verificar que DATABASE_URL apunta a Neon
case "$DATABASE_URL" in
  *neon.tech*) echo "✅ DATABASE_URL: Neon (pooler)";;
  *) echo "⚠ DATABASE_URL no apunta a Neon: $DATABASE_URL";;
esac

# Daemonizar: setsid + disown para que sobreviva entre tool calls
setsid bun run dev > dev.log 2>&1 &
disown
echo "🚀 Dev server started (PID $!)"
sleep 8
echo "--- dev.log tail ---"
tail -20 dev.log
