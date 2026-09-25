#!/usr/bin/env bash
# chat-api-debug.sh — depura el login demo vía curl y la sesión resultante.
# Uso: bash scripts/preview-run.sh bash scripts/chat-api-debug.sh
set -u
cd "$(dirname "$0")/.."
set -a; [ -f .env ] && . ./.env; set +a

B=http://localhost:3000
J=/tmp/jar-debug.txt
rm -f "$J"

CSRF=$(curl -s -c "$J" "$B/api/auth/csrf" | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).csrfToken')
echo "csrf=$CSRF"

echo "--- POST /api/auth/callback/demo (mostrando Location) ---"
curl -s -D - -o /dev/null -b "$J" -c "$J" -X POST "$B/api/auth/callback/demo" \
  -d "csrfToken=$CSRF" -d "email=ana@test.local" -d "callbackUrl=http%3A%2F%2Flocalhost%3A3000%2F" -d "json=true" \
  | rg -i "^(HTTP|location|set-cookie)" | head -8

echo "--- cookies en jar ---"
rg -v "^#" "$J" | awk '{print $6"="substr($7,1,24)"..."}'

echo "--- GET /api/auth/session ---"
curl -s -b "$J" "$B/api/auth/session" | head -c 400; echo

echo "--- GET /api/chat/users?q=beto ---"
curl -s -w "\n[HTTP %{http_code}]" -b "$J" "$B/api/chat/users?q=beto" | head -c 600; echo
