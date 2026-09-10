#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🚀 SESSION BOOT — arranque casi automático de sesión Conecta-LT
# Uso: bash scripts/session-boot.sh   (o: bun run boot)
# El agente debe usar este output como contexto inicial COMPLETO.
# Evita leer worklog.md completo (pesado) — aquí viene lo esencial.
# ═══════════════════════════════════════════════════════════════
cd /home/z/my-project || exit 1

echo "═══════════════════════════════════════════════"
echo "🚀 BOOT CONECTA-LT — $(date -u +'%Y-%m-%d %H:%M') UTC"
echo "═══════════════════════════════════════════════"

# ── 1. LIMPIAR GOTCHA del shell (SQLite vieja pisa el .env) ──
unset DATABASE_URL DIRECT_URL
echo "①  Shell limpio (gotcha DATABASE_URL neutralizado) ✅"

# ── 2. DEPENDENCIAS ──────────────────────────────────────────
if [ ! -d node_modules ]; then
  echo "②  node_modules ausente → bun install..."
  bun install 2>&1 | tail -1
else
  echo "②  Dependencias presentes ✅"
fi

# ── 3. CLIENTE PRISMA ────────────────────────────────────────
if [ ! -f node_modules/.prisma/client/index.js ]; then
  echo "③  Generando cliente Prisma..."
  bunx prisma generate 2>&1 | tail -1
else
  echo "③  Cliente Prisma presente ✅"
fi

# ── 4. .ENV / NEON ───────────────────────────────────────────
if grep -q "ep-xxxx" .env 2>/dev/null; then
  echo "④  🔴 .env con PLACEHOLDER — pedir DATABASE_URL al usuario (Neon console)"
elif [ -f .env ] && grep -q "postgresql://" .env; then
  echo "④  .env con Neon configurado ✅"
else
  echo "④  🔴 .env ausente o sin postgresql:// — reconstruir (ver RECOVERY.md paso 6)"
fi

# ── 5. DEV SERVER ────────────────────────────────────────────
if curl -s -o /dev/null --max-time 3 http://localhost:3000/; then
  echo "⑤  Dev server YA corriendo ✅"
else
  echo "⑤  Arrancando dev server (~25s)..."
  (nohup ./start-dev.sh > /tmp/dev-boot.log 2>&1 &)
  sleep 25
fi

# ── 6. HEALTH CHECK APP + DATOS ──────────────────────────────
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 http://localhost:3000/)
echo "⑥  HTTP localhost:3000 → $code"
api_sample=$(curl -s --max-time 15 "http://localhost:3000/api/businesses" | head -c 120)
if echo "$api_sample" | grep -q '"slug"'; then
  echo "   API con datos reales ✅ → $api_sample..."
else
  echo "   🔴 API sin datos → revisar .env / dev.log"
fi

# ── 7. ESTADO GIT ────────────────────────────────────────────
echo "⑦  Git — HEAD y árbol:"
git log --oneline -3 2>/dev/null | sed 's/^/   /'
dirty=$(git status -s | wc -l | tr -d ' ')
ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "?")
echo "   Cambios sin commit: $dirty | Commits sin push: $ahead"

# ── 8. CONTEXTO VOLÁTIL (la RAM) ─────────────────────────────
echo "⑧  ═══ SESSION_HANDOFF.md (estado actual) ═══"
cat SESSION_HANDOFF.md 2>/dev/null || echo "   (no existe — crearlo)"

# ── 9. CABECERA DE PROJECT_STATUS.md ─────────────────────────
echo "⑨  ═══ PROJECT_STATUS.md (cabecera) ═══"
head -8 PROJECT_STATUS.md | sed 's/^/   /'

# ── 10. ÚLTIMA ENTRADA DEL WORKLOG (solo la cola, NO el todo) ─
echo "⑩  ═══ worklog.md — última entrada ═══"
awk '/^Task ID:/{buf=""} {buf=buf $0 "\n"} END{printf "%s", buf}' worklog.md | tail -30 | sed 's/^/   /'

echo "═══════════════════════════════════════════════"
echo "🏁 BOOT COMPLETO — contexto listo. Ejecutar health check:"
echo "   bash scripts/session-health.sh"
echo "═══════════════════════════════════════════════"
