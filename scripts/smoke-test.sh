#!/bin/bash
# Smoke test E2E en una sola llamada: levanta server, prueba rutas clave, apaga
cd /home/z/my-project
unset DATABASE_URL DIRECT_URL

echo "═══ SMOKE TEST E2E CONECTA-LT ═══"
setsid nohup bash run-dev.sh > dev.log 2>&1 < /dev/null &
SERVER_PID=$!

# Espera a que el puerto responda (máx 90s)
READY=0
for i in $(seq 1 90); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5 2>/dev/null)
  if [ "$CODE" = "200" ]; then READY=1; break; fi
  sleep 1
done

if [ "$READY" = "1" ]; then
  echo "✅ Server listo tras ${i}s (HTTP 200)"
else
  echo "🔴 Server no respondió en 90s"; tail -10 dev.log; kill $SERVER_PID 2>/dev/null; exit 1
fi

# Prueba rutas clave
declare -A RUTAS=(
  ["/"]="Home"
  ["/api/businesses"]="API negocios"
  ["/api/categories"]="API categorías"
)
for ruta in "/" "/api/businesses" "/api/categories"; do
  printf "%-20s → " "$ruta"
  curl -s -o /dev/null -w "%{http_code} (%{time_total}s)\n" "http://localhost:3000$ruta" --max-time 60
done

echo "── Muestra datos /api/businesses:"
curl -s "http://localhost:3000/api/businesses" --max-time 60 | head -c 600
echo
echo "── Muestra datos /api/categories:"
curl -s "http://localhost:3000/api/categories" --max-time 60 | head -c 300
echo

# ¿La home renderiza contenido real de negocios?
echo "── Home contiene contenido dinámico:"
curl -s http://localhost:3000 --max-time 60 | grep -o -m 3 -E "(Don Sancho|La Cava|Eclipse|Conecta)" | sort -u

kill $SERVER_PID 2>/dev/null
echo "═══ SMOKE TEST COMPLETO ═══"
