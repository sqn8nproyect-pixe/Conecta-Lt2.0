#!/usr/bin/env bash
# chat-e2e-mobile.sh — verificación responsive de la vista Mensajes (iPhone 14).
#   bash scripts/preview-run.sh bash scripts/chat-e2e-mobile.sh
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a
step() { echo; echo "===== $1 ====="; }

bun run dev > /tmp/chat-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null; pkill -f "agent-browser" 2>/dev/null' EXIT
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 2 2>/dev/null || true)
  [ "$code" = "200" ] && break
  sleep 2
done
step "DEV READY http=$code"

agent-browser set device "iPhone 14"
agent-browser open http://localhost:3000
agent-browser cookies set age-verified 1
agent-browser reload
agent-browser wait --fn "document.readyState === 'complete'" --timeout 20000
sleep 4

# login demo (ana ya tiene conversación con beto de la prueba anterior)
agent-browser find role button click --name "Acceder"
agent-browser wait --text "Acceso demo" --timeout 15000
agent-browser find role button click --name "Acceso demo"
for i in $(seq 1 10); do
  agent-browser find label "Correo electrónico" fill "ana@test.local" 2>/dev/null && break
  sleep 3
done
agent-browser find role button click --name "Entrar"
agent-browser wait --text "Mi Perfil" --timeout 30000
sleep 2

step "Móvil: badge en bottom nav"
agent-browser eval "document.querySelector('button[aria-label*=\"Mensajes\"]')?.getAttribute('aria-label') || 'NO_NAV'"

step "Móvil: abrir Mensajes desde bottom nav"
agent-browser find role button click --name "Mensajes"
agent-browser wait --text "Nuevo chat" --timeout 15000
agent-browser screenshot e2e-shots/chat-movil-bandeja.png

step "Móvil: abrir conversación (alternada)"
agent-browser find text "Beto Prueba" click
sleep 2
agent-browser wait --text "Gracias Ana" --timeout 10000 \
  && echo "PASS movil_ve_historial" || echo "FAIL movil_ve_historial"
agent-browser screenshot e2e-shots/chat-movil-conversacion.png

step "Móvil: botón volver"
agent-browser find role button click --name "Volver a la bandeja" \
  && echo "PASS boton_volver" || echo "FAIL boton_volver"
sleep 1
agent-browser screenshot e2e-shots/chat-movil-vuelta.png

agent-browser close 2>/dev/null
echo; echo "===== E2E MÓVIL FIN ====="
