#!/bin/bash
# Genera las 5 portadas faltantes del catálogo (estilo consistente: ámbar cálido, sin texto)
set -e
cd /home/z/my-project

GEN() {
  local out="$1"; shift
  local prompt="$1"
  if [ -f "public/images/$out" ]; then echo "skip $out (ya existe)"; return; fi
  echo "→ generando $out ..."
  z-ai image -p "$prompt" -o "public/images/$out" -s 1024x1024
}

GEN "bodegon-panamericana.png" "Interior of a Venezuelan bodega liquor store at dusk, glass door refrigerators full of cold beer bottles, wooden shelves stocked with rum and whisky bottles, warm amber LED strip lighting, inviting corner store atmosphere, professional interior photography, no people, no text, no signs, high quality, detailed"

GEN "licoreria-chuky.png" "Close-up of premium whisky and rum bottles lined on illuminated wooden shelves in a cozy neighborhood liquor store, warm amber backlighting, dark wood and brass details, shallow depth of field, professional product photography, no people, no text, no labels readable, high quality, detailed"

GEN "el-llanero.png" "Rustic Venezuelan plains style liquor shop interior, dark wooden shelves with rum bottles, subtle leather and jute rustic decorative details, warm golden evening light, cozy traditional atmosphere, professional interior photography, no people, no text, no signs, high quality, detailed"

GEN "licoreria-la-macarena.png" "Neighborhood liquor store counter at night with illuminated back bar display of colorful liquor bottles, warm tungsten lighting, clean wooden shelves, welcoming golden glow, professional interior photography, no people, no text, no signs, high quality, detailed"

GEN "licoreria-la-llovizna.png" "Small mountain town liquor shop in the Venezuelan highlands at dusk, misty green mountains visible through the front window, warm amber interior lighting, wooden shelves with wine and liquor bottles, cozy mountain village atmosphere, professional interior photography, no people, no text, no signs, high quality, detailed"

echo "listo:"; ls -la public/images/ | rg "panamericana|chuky|llanero|macarena|llovizna"
