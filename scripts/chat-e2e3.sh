#!/usr/bin/env bash
# chat-e2e3.sh — E2E chat v3: locators por rol + reintentos de hidratación.
#   bash scripts/preview-run.sh bash scripts/chat-e2e3.sh
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

step() { echo; echo "===== $1 ====="; }
dbg() { local name="$1"; local S="${2:-}"; agent-browser $S snapshot -i > "/tmp/ab3-$name.txt" 2>&1; echo "  [dbg] /tmp/ab3-$name.txt"; }

# fill_retry <flags> <label> <valor> — reintenta hasta 10 veces (3s)
fill_retry() {
  local S="$1"; local LABEL="$2"; local VAL="$3"
  for i in $(seq 1 10); do
    if agent-browser $S find role textbox fill "$VAL" --name "$LABEL" 2>/dev/null; then return 0; fi
    sleep 3
  done
  return 1
}

bun run dev > /tmp/chat-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null; pkill -f "agent-browser" 2>/dev/null' EXIT
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
step "DEV READY http=$code"

# login_demo <flags-sesión> <email>
login_demo() {
  local S="$1"; local EMAIL="$2"
  agent-browser $S open http://localhost:3000
  agent-browser $S cookies set age-verified 1
  agent-browser $S reload
  agent-browser $S wait --fn "document.readyState === 'complete'" --timeout 20000
  sleep 4

  agent-browser $S find role button click --name "Acceder" || { echo "  ERR click Acceder"; dbg "acceder$S" "$S"; return 1; }
  agent-browser $S wait --text "Acceso demo" --timeout 15000 || { echo "  ERR modal login"; dbg "modal$S" "$S"; return 1; }
  agent-browser $S find role button click --name "Acceso demo" || { echo "  ERR click Acceso demo"; dbg "demobtn$S" "$S"; return 1; }

  # El modal demo compila/renderiza con retardo en dev → reintentos.
  local filled=0
  for i in $(seq 1 10); do
    if agent-browser $S find label "Correo electrónico" fill "$EMAIL" 2>/dev/null; then filled=1; break; fi
    sleep 3
  done
  [ "$filled" = "1" ] || { echo "  ERR input demo no apareció"; dbg "input$S" "$S"; return 1; }
  sleep 1
  agent-browser $S find role button click --name "Entrar" || { echo "  ERR click Entrar"; dbg "entrar$S" "$S"; return 1; }
  agent-browser $S wait --text "Mi Perfil" --timeout 30000 || { echo "  ERR sesión no activó"; dbg "postlogin$S" "$S"; return 1; }
  sleep 2
  echo "  LOGIN OK: $EMAIL"
}

# ── ANA ──────────────────────────────────────────────────────
step "ANA: login"
login_demo "" "ana@test.local" || echo "FATAL login ana"

step "ANA: Mensajes → Nuevo chat → Beto"
agent-browser find role button click --name "Mensajes" || { echo "ERR nav Mensajes"; dbg "nav-ana"; }
agent-browser wait --text "Nuevo chat" --timeout 15000 || dbg "vista-ana"
agent-browser find role button click --name "Nuevo chat"
agent-browser find role textbox fill "beto" --name "Buscar usuarios"
agent-browser wait --text "Beto Prueba" --timeout 12000 || dbg "busqueda-ana"
agent-browser find text "Beto Prueba" click || agent-browser find role button click --name "Beto Prueba"
fill_retry "" "Escribe un mensaje" "Hola Beto, bienvenido a CONECTA-LT" || dbg "chat-ana"

step "ANA: enviar mensaje"
agent-browser press Enter
agent-browser wait --text "Hola Beto, bienvenido" --timeout 12000 \
  && echo "PASS ana_mensaje_visible" || { echo "FAIL ana_mensaje_visible"; dbg "envio-ana"; }
mkdir -p e2e-shots
agent-browser screenshot e2e-shots/chat-ana-conversacion.png

# ── BETO ─────────────────────────────────────────────────────
step "BETO: login"
agent-browser --session beto open about:blank 2>/dev/null
login_demo "--session beto" "beto@test.local" || echo "FATAL login beto"

step "BETO: badge antes de abrir"
agent-browser --session beto eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"

step "BETO: abrir conversación"
agent-browser --session beto find role button click --name "Mensajes" || dbg "nav-beto"
agent-browser --session beto wait --text "Ana Prueba" --timeout 20000 \
  && echo "PASS beto_ve_conversacion" || dbg "bandeja-beto"
agent-browser --session beto find text "Ana Prueba" click || agent-browser --session beto find role button click --name "Ana Prueba"
agent-browser --session beto wait --text "Hola Beto, bienvenido" --timeout 15000 \
  && echo "PASS beto_ve_mensaje" || dbg "chat-beto"
agent-browser --session beto screenshot e2e-shots/chat-beto-conversacion.png

step "BETO: badge tras leer"
sleep 6
agent-browser --session beto eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"

step "BETO: responder"
fill_retry "--session beto" "Escribe un mensaje" "Gracias Ana, igualmente" || dbg "composer-beto"
agent-browser --session beto press Enter
agent-browser --session beto wait --text "Gracias Ana, igualmente" --timeout 12000 \
  && echo "PASS beto_responde" || dbg "envio-beto"

step "ANA: badge + respuesta por polling"
agent-browser eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"
agent-browser wait --text "Gracias Ana, igualmente" --timeout 25000 \
  && echo "PASS ana_ve_respuesta_polling" || dbg "respuesta-ana"
agent-browser screenshot e2e-shots/chat-ana-respuesta.png

step "ERRORES DE CONSOLA (ana)"
agent-browser errors || true

agent-browser close 2>/dev/null
agent-browser --session beto close 2>/dev/null
echo; echo "===== E2E FIN ====="
