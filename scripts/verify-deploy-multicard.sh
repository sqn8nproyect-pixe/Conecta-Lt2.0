#!/bin/bash
# Verifica el despliegue del carrusel MULTITARJETA en conectalt.com
# sin API de GitHub (rate-limited): descarga los chunks JS servidos
# en el HTML de producción y busca las clases/textos del Sprint 8.14.
# Reintenta hasta 10 veces (Vercel tarda 2-5 min en desplegar).
cd /home/z/my-project || exit 1

for intento in $(seq 1 10); do
  HTML=$(curl -s --max-time 30 https://conectalt.com)
  CHUNKS=$(echo "$HTML" | grep -oE '/_next/static/chunks/[a-z0-9]+\.js' | sort -u)
  TOTAL=$(echo "$CHUNKS" | grep -c . )
  HITS=""
  for c in $CHUNKS; do
    JS=$(curl -s --max-time 30 "https://conectalt.com$c")
    echo "$JS" | grep -q "basis-auto" && HITS="$HITS basis-auto@$c"
    echo "$JS" | grep -q "proporción original" && HITS="$HITS hint-admin@$c"
    echo "$JS" | grep -qF "blur-2xl" && HITS="$HITS blur-VIEJO@$c"
  done
  echo "[intento $intento] chunks=$TOTAL${HITS:+ →}$HITS"
  if echo "$HITS" | grep -q "basis-auto" && echo "$HITS" | grep -q "hint-admin" && ! echo "$HITS" | grep -q "blur-VIEJO"; then
    echo "DEPLOY_CONFIRMADO: multitarjeta en producción, sin fondo difuminado"
    exit 0
  fi
  sleep 45
done
echo "DEPLOY_NO_VISIBLE: reintentar más tarde"
exit 1
