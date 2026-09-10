#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# 🩺 SESSION HEALTH — sistema de advertencias tempranas
# Uso: bash scripts/session-health.sh   (o: bun run health)
# Detecta las condiciones que mataron el chat original ANTES de que
# sea tarde. Ejecutar tras cada tarea y antes de cerrar sesión.
# ═══════════════════════════════════════════════════════════════
cd /home/z/my-project || exit 1

VEREDICTO=0  # 0=verde 1=amarillo 2=rojo
upgrade() { [ "$1" -gt "$VEREDICTO" ] && VEREDICTO=$1; }

echo "═══════════════════════════════════════════════"
echo "🩺 HEALTH CHECK CONECTA-LT — $(date -u +'%Y-%m-%d %H:%M') UTC"
echo "═══════════════════════════════════════════════"

# ── CHECK 1: peso del worklog (contexto bomba) ───────────────
entries=$(grep -c "^Task ID:" worklog.md 2>/dev/null || echo 0)
size_kb=$(du -k worklog.md | cut -f1)
if [ "$entries" -gt 15 ]; then
  echo "🔴 WORKLOG: $entries entradas (${size_kb}KB) — ARCHIVAR YA: bun run scripts/archive-worklog.ts 10"
  upgrade 2
elif [ "$entries" -gt 10 ]; then
  echo "🟡 WORKLOG: $entries entradas (${size_kb}KB) — considera archivar pronto"
  upgrade 1
else
  echo "🟢 WORKLOG: $entries entradas (${size_kb}KB) — saludable"
fi

# ── CHECK 2: árbol git sucio (trabajo sin commit = riesgo) ───
dirty=$(git status -s | wc -l | tr -d ' ')
if [ "$dirty" -gt 0 ]; then
  echo "🟡 GIT: $dirty archivos sin commit — cerrar la tarea en un commit antes de seguir"
  upgrade 1
else
  echo "🟢 GIT: árbol limpio"
fi

# ── CHECK 3: commits sin push (no respaldados en GitHub) ─────
ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo -1)
if [ "$ahead" -lt 0 ]; then
  echo "🟡 GIT: sin referencia remota (sin fetch reciente) — Push ritual pendiente"
  upgrade 1
elif [ "$ahead" -gt 5 ]; then
  echo "🔴 GIT: $ahead commits SIN PUSH a GitHub — mucho trabajo en riesgo, hacer push YA"
  upgrade 2
elif [ "$ahead" -gt 0 ]; then
  echo "🟡 GIT: $ahead commit(s) sin push — respaldar en GitHub al cerrar la sesión"
  upgrade 1
else
  echo "🟢 GIT: todo respaldado en origin/main"
fi

# ── CHECK 4: fatiga de la sesión (tareas acumuladas) ─────────
tareas=$(grep -oE "Tareas en esta sesión:\**\s*[0-9]+" SESSION_HANDOFF.md 2>/dev/null | grep -oE "[0-9]+" | tail -1 || echo 0)
if [ "$tareas" -ge 6 ]; then
  echo "🔴 SESIÓN: $tareas tareas acumuladas en este chat — ABRIR CHAT NUEVO YA (riesgo de '¡Ups! Algo salió mal')"
  echo "   Ritual de cierre: push (PAT) → abrir chat nuevo → escribir 'boot'"
  upgrade 2
elif [ "$tareas" -ge 4 ]; then
  echo "🟡 SESIÓN: $tareas tareas en este chat — planear abrir chat nuevo en 1-2 tareas más"
  upgrade 1
else
  echo "🟢 SESIÓN: $tareas tareas en este chat — fresco"
fi

# ── CHECK 5: DATABASE_URL real (¿Neon conectado?) ────────────
if grep -q "ep-xxxx" .env 2>/dev/null; then
  echo "🔴 ENV: .env con placeholder — la app corre sin datos. Pedir credencial Neon."
  upgrade 2
elif [ -f .env ] && grep -q "postgresql://" .env; then
  echo "🟢 ENV: Neon configurado en .env"
else
  echo "🔴 ENV: .env ausente/roto — reconstruir según RECOVERY.md paso 6"
  upgrade 2
fi

# ── CHECK 6: app viva con datos ───────────────────────────────
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:3000/ 2>/dev/null || echo 000)
if [ "$code" = "200" ]; then
  if curl -s --max-time 10 "http://localhost:3000/api/businesses" | grep -q '"slug"'; then
    echo "🟢 APP: HTTP 200 + API con datos reales"
  else
    echo "🟡 APP: HTTP 200 pero API sin datos — revisar .env/dev.log"
    upgrade 1
  fi
elif [ "$code" = "000" ]; then
  echo "🟡 APP: dev server apagado — arrancar con: bash scripts/session-boot.sh"
  upgrade 1
else
  echo "🟡 APP: HTTP $code — revisar dev.log"
  upgrade 1
fi

# ── VEREDICTO FINAL ───────────────────────────────────────────
echo "═══════════════════════════════════════════════"
case $VEREDICTO in
  0) echo "🟢 VEREDICTO: TODO SALUDABLE — continúa trabajando con tranquilidad" ;;
  1) echo "🟡 VEREDICTO: ATENCIÓN — hay riesgos menores, atiéndelos al cerrar la tarea actual" ;;
  2) echo "🔴 VEREDICTO: RIESGO ALTO — atiende los 🔴 ANTES de empezar otra tarea" ;;
esac
echo "═══════════════════════════════════════════════"
exit $VEREDICTO
