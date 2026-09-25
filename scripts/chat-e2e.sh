#!/usr/bin/env bash
# chat-e2e.sh — E2E del chat 1-a-1 con dos sesiones de browser.
# Se ejecuta vía preview-run.sh (PG embebida viva durante la llamada):
#   bash scripts/preview-run.sh bash scripts/chat-e2e.sh
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

step() { echo; echo "===== $1 ====="; }

# ── Dev server en background ────────────────────────────────
bun run dev > /tmp/chat-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null; pkill -f "agent-browser" 2>/dev/null' EXIT

for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
step "DEV READY http=$code (pid $DEV_PID)"
tail -3 /tmp/chat-dev.log

# ── Chequeo API anónimo (debe ser 401) ──────────────────────
step "API anónima /api/chat/conversations"
curl -s -o /dev/null -w "anon_status=%{http_code}\n" http://localhost:3000/api/chat/conversations

# ── SESIÓN ANA ───────────────────────────────────────────────
step "ANA: abrir + AgeGate + login demo"
agent-browser open http://localhost:3000
agent-browser cookies set age-verified 1
agent-browser reload
sleep 2
agent-browser find role button click --name "Acceder" || agent-browser find text "Acceder" click
sleep 1
agent-browser find text "Acceso demo" click
sleep 1
agent-browser find label "Correo electrónico" fill "ana@test.local"
agent-browser press Enter
sleep 4
agent-browser open http://localhost:3000
sleep 2

step "ANA: ir a Mensajes + nuevo chat"
agent-browser find text "Mensajes" click
sleep 2
agent-browser find text "Nuevo chat" click
sleep 1
agent-browser find role textbox fill "beto" --name "Buscar usuarios"
sleep 2
agent-browser find text "Beto Prueba" click
sleep 2

step "ANA: enviar mensaje de texto"
agent-browser find role textbox fill "Hola Beto, bienvenido a CONECTA-LT" --name "Escribe un mensaje"
agent-browser press Enter
sleep 2
agent-browser wait --text "Hola Beto, bienvenido" --timeout 8000 \
  && echo "PASS ana_mensaje_visible" || echo "FAIL ana_mensaje_visible"
mkdir -p e2e-shots
agent-browser screenshot e2e-shots/chat-ana-conversacion.png

# ── SESIÓN BETO ──────────────────────────────────────────────
step "BETO: abrir + login demo"
agent-browser --session beto open http://localhost:3000
agent-browser --session beto cookies set age-verified 1
agent-browser --session beto reload
sleep 2
agent-browser --session beto find role button click --name "Acceder" || agent-browser --session beto find text "Acceder" click
sleep 1
agent-browser --session beto find text "Acceso demo" click
sleep 1
agent-browser --session beto find label "Correo electrónico" fill "beto@test.local"
agent-browser --session beto press Enter
sleep 4
agent-browser --session beto open http://localhost:3000
sleep 2

step "BETO: badge de Mensajes antes de abrir"
badge_beto=$(agent-browser --session beto eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'" | head -1)
echo "badge_beto_aria=$badge_beto"

step "BETO: abrir conversación y leer mensaje"
agent-browser --session beto find text "Mensajes" click
sleep 2
agent-browser --session beto wait --text "Ana Prueba" --timeout 20000 \
  && echo "PASS beto_ve_conversacion" || echo "FAIL beto_ve_conversacion"
agent-browser --session beto find text "Ana Prueba" click
sleep 3
agent-browser --session beto wait --text "Hola Beto, bienvenido" --timeout 15000 \
  && echo "PASS beto_ve_mensaje" || echo "FAIL beto_ve_mensaje"
agent-browser --session beto screenshot e2e-shots/chat-beto-conversacion.png

step "BETO: badge después de leer (debe limpiarse)"
badge_beto2=$(agent-browser --session beto eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'" | head -1)
echo "badge_beto_aria_tras_leer=$badge_beto2"

step "BETO: responder"
agent-browser --session beto find role textbox fill "Gracias Ana, igualmente" --name "Escribe un mensaje"
agent-browser --session beto press Enter
sleep 2
agent-browser --session beto wait --text "Gracias Ana" --timeout 8000 \
  && echo "PASS beto_responde" || echo "FAIL beto_responde"

# ── ANA: badge + ver la respuesta (polling) ─────────────────
step "ANA: badge con respuesta de Beto"
badge_ana=$(agent-browser eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'" | head -1)
echo "badge_ana_aria=$badge_ana"
agent-browser wait --text "Gracias Ana, igualmente" --timeout 25000 \
  && echo "PASS ana_ve_respuesta_polling" || echo "FAIL ana_ve_respuesta_polling"
agent-browser screenshot e2e-shots/chat-ana-respuesta.png

# ── Console errors ───────────────────────────────────────────
step "ERRORES DE PÁGINA (sesión ana)"
agent-browser errors || true

agent-browser close 2>/dev/null
agent-browser --session beto close 2>/dev/null
echo; echo "===== E2E FIN ====="
