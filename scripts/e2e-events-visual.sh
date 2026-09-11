#!/bin/bash
# ─────────────────────────────────────────────────────────────
# E2E VISUAL Sprint 8.6 v5 — todo por localizadores de ROL
# (los refs de snapshot resultaron inestables; role+name es fiable).
# Incluye: verificación de valores tras cada fill (con fallback
# type), submit con fallback eval, y diagnóstico post-save.
# ─────────────────────────────────────────────────────────────
set +e
cd /home/z/my-project
SHOTS=/home/z/my-project/e2e-shots
mkdir -p "$SHOTS"

# fill_robust CSS VALOR → fill con verificación de .value + fallback type
fill_robust() {
  agent-browser find first "$1" fill "$2" >/dev/null 2>&1
  local v
  v=$(agent-browser eval "document.querySelector(\"$1\")?.value ?? 'NULO'" 2>/dev/null | tail -1)
  if [ "$v" != "$2" ]; then
    agent-browser find first "$1" click >/dev/null 2>&1
    agent-browser press Control+a >/dev/null 2>&1
    agent-browser find first "$1" type "$2" >/dev/null 2>&1
    v=$(agent-browser eval "document.querySelector(\"$1\")?.value ?? 'NULO'" 2>/dev/null | tail -1)
  fi
  echo "$v"
}

echo "── [1] Server standalone :3100"
set -a; source .env; set +a
(NODE_ENV=production PORT=3100 bun .next/standalone/server.js > "$SHOTS/server.log" 2>&1 &)
sleep 7
curl -s -o /dev/null -w "   server http: %{http_code}\n" http://localhost:3100/api/auth/providers

echo "── [2] Browser: home + AgeGate"
agent-browser close >/dev/null 2>&1
agent-browser set viewport 1280 900 >/dev/null
agent-browser open http://localhost:3100 >/dev/null
sleep 4
agent-browser screenshot "$SHOTS/01-agegate.png" >/dev/null
agent-browser find role button click --name "SOY MAYOR DE EDAD" && echo "   ✅ agegate aceptado"
sleep 2
agent-browser screenshot "$SHOTS/02-home.png" >/dev/null

echo "── [3] Login demo como admin"
agent-browser find role button click --name "Acceder" && echo "   modal accesos abierto"
sleep 1
agent-browser screenshot "$SHOTS/03-login-prompt.png" >/dev/null
agent-browser find role button click --name "Acceso demo" && echo "   modal demo abierto"
sleep 1
EV=$(fill_robust "#demo-email" "sqn8nproyect@gmail.com")
echo "   email: $EV"
agent-browser screenshot "$SHOTS/04-demo-modal.png" >/dev/null
agent-browser find role button click --name "Entrar" && echo "   entrar enviado"
sleep 5
agent-browser screenshot "$SHOTS/05-logged.png" >/dev/null
if agent-browser find role button click --name "Admin" --dry-run >/dev/null 2>&1; then echo "   ✅ nav Admin presente"; fi
# (click real se hace en paso 4)

echo "── [4] Panel admin → tab Eventos"
agent-browser find role button click --name "Admin" && echo "   admin dashboard abierto"
sleep 2
agent-browser screenshot "$SHOTS/06-admin.png" >/dev/null
agent-browser find role tab click --name "Eventos" && echo "   tab Eventos abierto"
sleep 2
agent-browser screenshot "$SHOTS/07-eventos-tab.png" >/dev/null

echo "── [5] Nuevo evento: form completo"
agent-browser find role button click --name "Nuevo evento" && echo "   dialog abierto"
sleep 1
agent-browser find first "[role='dialog'] [role='combobox']" click
sleep 1
agent-browser find role option click --name "Africa Burguers" && echo "   local elegido"
sleep 1
EV=$(fill_robust "input[placeholder='Noche de DJ en vivo']" "Prueba Visual E2E — borrable")
echo "   título: $EV"
EV=$(fill_robust "input[placeholder='Salsa y merengue hasta tarde']" "Validación visual del ABM sin tocar código")
echo "   frase: $EV"
# fecha/hora: setter nativo + eventos (el fill de Playwright no persiste aquí)
EV=$(agent-browser eval "(() => { const d=document.querySelector('[role=\'dialog\']'); const inp=d&&d.querySelector('input[type=\'date\']'); if(!inp) return 'NO-INPUT'; const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(inp,'2026-09-19'); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); return 'fecha='+inp.value; })()" 2>/dev/null | tail -1)
echo "   $EV"
EV=$(agent-browser eval "(() => { const d=document.querySelector('[role=\'dialog\']'); const inp=d&&d.querySelector('input[type=\'time\']'); if(!inp) return 'NO-INPUT'; const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(inp,'21:00'); inp.dispatchEvent(new Event('input',{bubbles:true})); inp.dispatchEvent(new Event('change',{bubbles:true})); return 'hora='+inp.value; })()" 2>/dev/null | tail -1)
echo "   $EV"
agent-browser eval "(() => { const c=document.querySelectorAll('[role=\'dialog\'] [role=\'combobox\']')[2]; if(!c) return 'NO-COMBOBOX'; c.scrollIntoView({block:'center'}); c.focus(); return 'scroll+focus'; })()" >/dev/null
sleep 1
agent-browser find nth 2 "[role='dialog'] [role='combobox']" click 2>/dev/null
sleep 1
if ! agent-browser find role option click --name "Borrador" 2>/dev/null; then
  echo "   click cubierto → camino teclado"
  agent-browser press Escape >/dev/null 2>&1
  agent-browser eval "(() => { const c=document.querySelectorAll('[role=\'dialog\'] [role=\'combobox\']')[2]; c.scrollIntoView({block:'center'}); c.focus(); return 'focused'; })()" >/dev/null
  sleep 1
  agent-browser press ArrowDown; sleep 1
  agent-browser press ArrowDown; sleep 0.5
  agent-browser press Enter; sleep 1
fi
ESTADO=$(agent-browser eval "document.querySelectorAll('[role=\'dialog\'] [role=\'combobox\']')[2].textContent" 2>/dev/null | tail -1)
echo "   estado del combo: $ESTADO"
sleep 1
agent-browser screenshot "$SHOTS/08-form-lleno.png" >/dev/null && echo "   form capturado"

echo "── [5b] Guardar (con fallback eval)"
agent-browser find role button click --name "Crear evento" 2>/dev/null && echo "   guardar enviado (role)"
sleep 2
# si el dialog sigue abierto → fallback: click JS directo al botón
if agent-browser find first "[role='dialog']" --dry-run >/dev/null 2>&1 || agent-browser eval "!!document.querySelector('[role=\'dialog\']')" 2>/dev/null | grep -q true; then
  agent-browser eval "(() => { const b=[...document.querySelectorAll('[role=\'dialog\'] button')].find(x=>x.textContent.trim()==='Crear evento'); if(!b) return 'BTN-NO-ESTA'; b.click(); return 'submit-eval'; })()"
  sleep 2
fi
agent-browser wait --text "creado." --timeout 12000 >/dev/null 2>&1 && echo "   ✅ toast 'creado' recibido"
sleep 1
if agent-browser wait --text "Prueba Visual E2E" --timeout 8000 >/dev/null 2>&1; then
  echo "   ✅ fila creada visible en el listado"
else
  echo "   🔴 fila NO apareció — estado del dialog:"
  agent-browser eval "document.querySelector('[role=\'dialog\']')?.innerText.slice(0,300) || 'dialog cerrado'"
  agent-browser screenshot "$SHOTS/09b-form-error.png" >/dev/null
fi
agent-browser screenshot "$SHOTS/09-fila-creada.png" >/dev/null

echo "── [6] Toggle publicar (Eye) en la fila de prueba"
agent-browser eval "(() => { const el=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Prueba Visual E2E')); const b=el&&el.querySelector('button[title=\"Publicar\"]'); if(!b) return 'BTN-NO-ENCONTRADO'; b.click(); return 'publicar-click'; })()"
sleep 2
agent-browser wait --text "publicado" --timeout 10000 >/dev/null 2>&1 && echo "   ✅ toast 'publicado' recibido"
agent-browser screenshot "$SHOTS/10-publicado.png" >/dev/null

echo "── [7] Editar título (Pencil)"
agent-browser eval "(() => { const el=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Prueba Visual E2E')); const b=el&&el.querySelector('button[title=\"Editar\"]'); if(!b) return 'BTN-NO-ENCONTRADO'; b.click(); return 'editar-click'; })()"
sleep 1
EV=$(fill_robust "input[placeholder='Noche de DJ en vivo']" "Prueba Visual E2E — editada")
echo "   título editado: $EV"
agent-browser find role button click --name "Guardar cambios" && echo "   cambios enviados"
sleep 2
agent-browser wait --text "actualizado" --timeout 10000 >/dev/null 2>&1 && echo "   ✅ toast 'actualizado' recibido"
sleep 1
agent-browser screenshot "$SHOTS/11-editada.png" >/dev/null

echo "── [8] Eliminar (Trash) + confirmar"
agent-browser eval "(() => { const el=[...document.querySelectorAll('li')].find(x=>x.textContent.includes('Prueba Visual E2E')); const b=el&&el.querySelector('button[title=\"Eliminar\"]'); if(!b) return 'BTN-NO-ENCONTRADO'; b.click(); return 'delete-click'; })()"
sleep 1
agent-browser screenshot "$SHOTS/12-confirm-delete.png" >/dev/null
agent-browser find first "[role='alertdialog'] button.bg-red-600" click && echo "   confirmado"
agent-browser wait --text "Evento eliminado" --timeout 10000 >/dev/null 2>&1 && echo "   ✅ toast 'Evento eliminado' recibido"
sleep 1
agent-browser screenshot "$SHOTS/13-post-delete.png" >/dev/null

echo "── [9] Vista móvil 390px (bonus)"
agent-browser set viewport 390 844 >/dev/null
sleep 1
agent-browser screenshot "$SHOTS/14-eventos-movil.png" >/dev/null && echo "   captura móvil lista"

echo "── [10] Errores JS de consola"
agent-browser errors > "$SHOTS/errors.txt" 2>&1
if grep -qi "error" "$SHOTS/errors.txt"; then head -8 "$SHOTS/errors.txt"; else echo "   (sin errores JS)"; fi
agent-browser close >/dev/null 2>&1
pkill -f "standalone/server.js" 2>/dev/null
echo "═══ E2E VISUAL v5 COMPLETADO ═══"
