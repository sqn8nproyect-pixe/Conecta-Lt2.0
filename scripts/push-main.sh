#!/usr/bin/env bash
# push-main.sh — push de la rama ACTUAL a main en GitHub usando un PAT temporal.
# Uso:   bash scripts/push-main.sh ghp_xxxxxxxx
# Nota:  el token llega por ARGUMENTO (nunca se guarda en disco).
#        NO commitear este archivo. Tras el ciclo, el dueño revoca el token.
set -euo pipefail

TOKEN="${1:?Uso: bash scripts/push-main.sh <TOKEN>}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REMOTE_URL="https://x-access-token:${TOKEN}@github.com/sqn8nproyect-pixe/Conecta-Lt2.0.git"

echo "→ Validando token con ls-remote…"
if ! git ls-remote "${REMOTE_URL}" refs/heads/main >/dev/null 2>&1; then
  echo "✗ Token inválido o sin acceso (ls-remote falló)." >&2
  exit 1
fi
echo "✓ Token válido."

echo "→ Push ${BRANCH} → main…"
git push "${REMOTE_URL}" "${BRANCH}:main"

echo "✓ OK: ${BRANCH} pusheado a main. Deploy de Vercel en marcha (~30-60s)."
