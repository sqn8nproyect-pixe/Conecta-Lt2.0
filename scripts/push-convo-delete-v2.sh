#!/bin/bash
# Push del clon limpio (/home/z/conecta-clean, rama feat/delete-conversation-total)
# a GitHub main. Uso: bash scripts/push-convo-delete-v2.sh ghp_XXXX
# El PAT se usa SOLO en memoria (nunca se imprime, ni se guarda en disco/config).
set -euo pipefail

PAT="${1:-}"
CLEAN=/home/z/conecta-clean
REPO="sqn8nproyect-pixe/Conecta-Lt2.0"
BRANCH=feat/delete-conversation-total

if [[ -z "$PAT" ]]; then
  echo "ERROR: falta el PAT como argumento 1" >&2; exit 1
fi
if [[ ! -d "$CLEAN/.git" ]]; then
  echo "ERROR: no existe $CLEAN (clon limpio)" >&2; exit 2
fi
if [[ "$PAT" != ghp_* || ${#PAT} -lt 40 ]]; then
  echo "AVISO: el PAT no parece un token clásico de GitHub (ghp_...); se intenta igualmente." >&2
fi

# 1) Validar token contra la API (solo se imprime el login y el scope)
API=$(curl -sS -H "Authorization: token $PAT" -H "Accept: application/vnd.github+json" \
  https://api.github.com/user)
LOGIN=$(node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).login||'')}catch(e){console.log('')}})" <<<"$API")
if [[ "$LOGIN" != "sqn8nproyect-pixe" ]]; then
  echo "ERROR: el token NO pertenece a sqn8nproyect-pixe (login='$LOGIN')" >&2; exit 3
fi
echo "OK: token válido, login=$LOGIN"
SCOPES=$(curl -sS -D- -o /dev/null -H "Authorization: token $PAT" https://api.github.com/user 2>/dev/null | tr -d '\r' | rg -i '^x-oauth-scopes:' || echo 'x-oauth-scopes: (vacío)')
echo "$SCOPES"
if echo "$SCOPES" | rg -qi ': *$|vacío'; then
  echo "ERROR: token SIN scopes (marca 'repo' al crearlo); no puede pushear." >&2; exit 6
fi

# 2) Chequeo previo: la rama debe contener a origin/main (push fast-forward)
LOCAL_SHA=$(git -C "$CLEAN" rev-parse "$BRANCH")
echo "Local: $LOCAL_SHA ($BRANCH)"
REMOTE_MAIN=$(git -C "$CLEAN" ls-remote https://github.com/${REPO}.git refs/heads/main | cut -f1)
echo "origin/main actual: $REMOTE_MAIN"
MB=$(git -C "$CLEAN" merge-base "$BRANCH" "$REMOTE_MAIN" 2>/dev/null || echo "")
if [[ "$MB" != "$REMOTE_MAIN" ]]; then
  echo "ERROR: origin/main ($REMOTE_MAIN) no es ancestro de la rama (merge-base=$MB) — rebase necesario antes de pushear." >&2; exit 7
fi

# 3) Push a main (URL con token SOLO en memoria del proceso)
URL="https://sqn8nproyect-pixe:${PAT}@github.com/${REPO}.git"
if git -C "$CLEAN" push "$URL" "${BRANCH}:main" 2>/tmp/push-err.log; then
  echo "PUSH OK"
else
  echo "PUSH FALLÓ — stderr (sin token):" >&2
  sed "s/${PAT}//g" /tmp/push-err.log >&2
  rm -f /tmp/push-err.log
  exit 4
fi
rm -f /tmp/push-err.log

# 4) Verificar SHA remoto
REMOTE_SHA=$(git -C "$CLEAN" ls-remote "$URL" refs/heads/main | cut -f1)
if [[ "$REMOTE_SHA" == "$LOCAL_SHA" ]]; then
  echo "VERIFICADO: origin/main = $REMOTE_SHA (idéntico al local)"
else
  echo "ERROR: remoto $REMOTE_SHA != local $LOCAL_SHA" >&2; exit 5
fi
echo "LISTO: main actualizado → Vercel auto-deploy (purga única de conversaciones 20260926140000 + feature v2)"
