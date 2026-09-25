#!/usr/bin/env bash
# chat-e2e2.sh — E2E chat v2: esperas robustas + verificación por paso.
#   bash scripts/preview-run.sh bash scripts/chat-e2e2.sh
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

step() { echo; echo "===== $1 ====="; }
dbg() { agent-browser snapshot -i > "/tmp/ab-$1.txt" 2>&1; echo "  [dbg] snapshot en /tmp/ab-$1.txt"; }

# ── Dev server ───────────────────────────────────────────────
bun run dev > /tmp/chat-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null; pkill -f "agent-browser" 2>/dev/null' EXIT
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
step "DEV READY http=$code"

login_demo() { # $1 = prefijo de sesión (vacío para ana), $2 = email
  local S="$1"; local EMAIL="$2"
  agent-browser $S open http://localhost:3000
  agent-browser $S cookies set age-verified 1
  agent-browser $S reload
  agent-browser $S wait --fn "document.readyState === 'complete'" --timeout 20000
  sleep 4  # hidratación de React (dev compila chunks al vuelo)

  agent-browser $S find role button click --name "Acceder"
  sleep 1
  agent-browser $S wait --text "Acceso demo" --timeout 10000 || { echo "  LOGIN-ERR: modal no abrió"; dbg "login-$EMAIL-modal"; return 1; }
  agent-browser $S find text "Acceso demo" click
  agent-browser $S wait --text "Correo electrónico" --timeout 10000 || { echo "  LOGIN-ERR: demo modal no abrió"; dbg "login-$EMAIL-demo"; return 1; }
  agent-browser $S find label "Correo electrónico" fill "$EMAIL"
  agent-browser $S press Enter
  # El éxito recarga la página; el nav pasa a mostrar "Mi Perfil".
  agent-browser $S wait --text "Mi Perfil" --timeout 25000 || { echo "  LOGIN-ERR: sesión no activó"; dbg "login-$EMAIL-post"; return 1; }
  sleep 2
  echo "  LOGIN OK: $EMAIL"
}

# ── SESIÓN ANA ───────────────────────────────────────────────
step "ANA: login"
login_demo "" "ana@test.local" || echo "FATAL: login ana falló"

step "ANA: Mensajes → Nuevo chat → Beto"
agent-browser find text "Mensajes" click
agent-browser wait --text "Nuevo chat" --timeout 15000 || { echo "ERR: vista mensajes no abrió"; dbg "ana-mensajes"; }
agent-browser find text "Nuevo chat" click
agent-browser wait --text "Buscar usuarios" --timeout 8000 || dbg "ana-nuevochat"
agent-browser find role textbox fill "beto" --name "Buscar usuarios"
agent-browser wait --text "Beto Prueba" --timeout 10000 || { echo "ERR: búsqueda sin resultados"; dbg "ana-busqueda"; }
agent-browser find text "Beto Prueba" click
agent-browser wait --text "Escribe un mensaje" --timeout 10000 || { echo "ERR: chat no abrió"; dbg "ana-chat"; }

step "ANA: enviar mensaje"
agent-browser find role textbox fill "Hola Beto, bienvenido a CONECTA-LT" --name "Escribe un mensaje"
agent-browser press Enter
agent-browser wait --text "Hola Beto, bienvenido" --timeout 10000 \
  && echo "PASS ana_mensaje_visible" || { echo "FAIL ana_mensaje_visible"; dbg "ana-envio"; }
mkdir -p e2e-shots
agent-browser screenshot e2e-shots/chat-ana-conversacion.png

# ── SESIÓN BETO ──────────────────────────────────────────────
step "BETO: login"
agent-browser --session beto open about:blank 2>/dev/null
login_demo "--session beto" "beto@test.local" || echo "FATAL: login beto falló"

step "BETO: badge antes de abrir"
agent-browser --session beto eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"

step "BETO: abrir conversación"
agent-browser --session beto find text "Mensajes" click
agent-browser --session beto wait --text "Ana Prueba" --timeout 20000 \
  && echo "PASS beto_ve_conversacion" || { echo "FAIL beto_ve_conversacion"; dbg "beto-bandeja"; }
agent-browser --session beto find text "Ana Prueba" click
agent-browser --session beto wait --text "Hola Beto, bienvenido" --timeout 15000 \
  && echo "PASS beto_ve_mensaje" || { echo "FAIL beto_ve_mensaje"; dbg "beto-chat"; }
agent-browser --session beto screenshot e2e-shots/chat-beto-conversacion.png

step "BETO: badge tras leer (debe limpiarse)"
sleep 6  # markRead + refetch del badge (15s máx)
agent-browser --session beto eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"

step "BETO: responder"
agent-browser --session beto find role textbox fill "Gracias Ana, igualmente" --name "Escribe un mensaje"
agent-browser --session beto press Enter
agent-browser --session beto wait --text "Gracias Ana, igualmente" --timeout 10000 \
  && echo "PASS beto_responde" || { echo "FAIL beto_responde"; dbg "beto-envio"; }

step "ANA: badge + respuesta por polling"
agent-browser eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"
agent-browser wait --text "Gracias Ana, igualmente" --timeout 25000 \
  && echo "PASS ana_ve_respuesta_polling" || { echo "FAIL ana_ve_respuesta_polling"; dbg "ana-respuesta"; }
agent-browser screenshot e2e-shots/chat-ana-respuesta.png

step "ERRORES DE CONSOLA (ana)"
agent-browser errors || true

agent-browser close 2>/dev/null
agent-browser --session beto close 2>/dev/null
echo; echo "===== E2E FIN ====="
