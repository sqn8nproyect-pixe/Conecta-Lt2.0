#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# ✅ SESSION TASK — ritual automático tras cerrar cada tarea
# Uso: bash scripts/session-task.sh   (o: bun run task)
# Hace 3 cosas:
#   1. Incrementa el contador de tareas de la sesión (SESSION_HANDOFF.md)
#   2. Actualiza la fecha de última actividad
#   3. Corre el health check con advertencias
# El agente SIEMPRE debe: (a) appendear worklog.md, (b) actualizar
# SESSION_HANDOFF.md, y (c) correr este script — en ese orden.
# ═══════════════════════════════════════════════════════════════
cd /home/z/my-project || exit 1

if [ ! -f SESSION_HANDOFF.md ]; then
  echo "🔴 SESSION_HANDOFF.md no existe — crearlo antes (ver RECOVERY.md)"
  exit 1
fi

# 1. Incrementar contador de tareas (soporta formato markdown **negrita**)
perl -i -pe 's/^(\*?\*?Tareas en esta sesión:\*?\*?\s*)(\d+)$/$1 . ($2 + 1)/e' SESSION_HANDOFF.md

# 2. Actualizar última actividad
newdate=$(date -u +'%Y-%m-%d %H:%M')
sed -i -E "s/^(\*?\*?Última actividad:\*?\*?).*/\1 ${newdate} UTC/" SESSION_HANDOFF.md

echo "✅ Contador de sesión incrementado y timestamp actualizado"
echo ""
# 3. Health check con advertencias
bash scripts/session-health.sh
