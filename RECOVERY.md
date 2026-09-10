# 🛡️ RECOVERY.md — Prevención y Rescate de Sesiones
# Conecta-LT · Última actualización: 2026-09-10

> Este documento existe porque el chat original murió el 10-Sep-2026 con
> "¡Ups! Algo salió mal" en cada mensaje. Se recuperó el 100% del trabajo en
> ~30 minutos siguiendo exactamente los pasos de abajo. Que no vuelva a pasar.

---

## 1. POR QUÉ SE TRABA UN CHAT (causas identificadas)

- **Chats demasiado longevos**: meses de trabajo acumulado en una sola sesión
  satura el contexto del agente y aumenta la probabilidad de fallo por mensaje.
- **Archivos de contexto gigantes**: worklog.md llegó a 544KB / 133 entradas.
  Cada lectura completa quema contexto innecesariamente.
- **Estado del sandbox no respaldado**: todo vivía en UN chat. Si el chat
  muere, el acceso muere con él.

## 2. HÁBITOS DE PREVENCIÓN (el código de conducta)

1. **Chats desechables**: un chat nuevo por lote de tareas o por semana.
   NUNCA arrastres el mismo chat durante meses.
2. **Arrancar SIEMPRE con el mensaje de boot** (ya está en PROJECT_STATUS.md):
   ```
   Lee PROJECT_STATUS.md y la cola de worklog.md para recuperar contexto.
   ```
3. **Push a GitHub al cerrar CADA tarea completada** (PAT temporal + revocar).
   GitHub es el verdadero backup; el sandbox es desechable.
4. **Secretos fuera del sandbox**: guarda DATABASE_URL, NEXTAUTH_SECRET y
   credenciales R2/Google en un gestor de contraseñas. El .env NO viaja en
   git ni en tars (por diseño). Sin esto, cada rescate necesita pedirte creds.
5. **worklog.md ligero**: solo las últimas ~10 entradas en el archivo activo.
   El resto va a `worklog-archivo-*.md`. Ya está implementado — NO dejes que
   vuelva a crecer sin control.
6. **Si un mensaje falla con "¡Ups! Algo salió mal"**: reintenta MÁXIMO 2-3
   veces con mensajes cortos. Si sigue fallando → activa el plan de rescate.
   Insistir 20 veces no arregla nada y agrava el contexto.

## 3. PLAN DE RESCATE (probado el 10-Sep-2026 — funciona)

Síntomas: cada mensaje devuelve "¡Ups! Algo salió mal", pero el panel de
archivos SÍ muestra el proyecto.

1. **NO entres en pánico y NO borres nada.** Los archivos del sandbox
   sobreviven aunque el chat esté muerto.
2. **Descarga el proyecto**: panel de archivos → botón **"Descargar"**
   (funciona aunque el agente no responda). Obtienes un `.tar`.
3. **Abre un chat NUEVO** y sube el `.tar` (botón ➕ del cuadro de mensaje).
4. **Mensaje de boot en el chat nuevo**:
   ```
   Lee PROJECT_STATUS.md y la cola de worklog.md para recuperar contexto.
   Este proyecto fue restaurado desde un tar: extrae en /home/z/my-project/,
   bun install, y pídeme PAT read-only para sincronizar con GitHub.
   ```
5. **Sincroniza con GitHub** (el tar puede estar viejo — GitHub no):
   - Crea PAT **fine-grained read-only** (Contents: Read-only, 1 repo, expiración corta)
   - `git fetch origin` → compara → `git reset --hard origin/main`
   - Revoca el PAT inmediatamente después
   - ⚠️ Antes del reset, revisa `git log origin/main..HEAD`: si hay commits
     locales, resgata su contenido (puede haber work preciado o basura de
     auto-snapshots de la plataforma con mensajes UUID).
6. **Reconstruye `.env`** desde tu gestor de contraseñas:
   DATABASE_URL (Neon pooled, SIN channel_binding), DIRECT_URL (sin -pooler),
   NEXTAUTH_SECRET/AUTH_SECRET, NEXTAUTH_URL/AUTH_URL.
7. **GOTCHA crítico**: el shell del sandbox exporta
   `DATABASE_URL=file:...custom.db` (SQLite vieja) que PISA el .env.
   Ejecutar antes de arrancar el dev server:
   ```bash
   unset DATABASE_URL DIRECT_URL
   ```
8. **Verifica**: `bun run db:verify-neon` → deve devolver los negocios reales.
   Arranca `./start-dev.sh` → HTTP 200 en localhost:3000 → revisa dev.log.

## 4. JERARQUÍA DE BACKUPS (qué protege qué)

| Capa | Qué protege | Frecuencia |
|------|-------------|------------|
| GitHub (push con PAT) | Código, migrations, docs | Cada tarea cerrada |
| Gestor de contraseñas | Secretos (.env) | Al rotar credenciales |
| Tar descargable del panel | Todo el sandbox incl. archivos sin trackear | Antes de cerrar chats importantes |
| Neon (DB cloud) | Los DATOS | Continuo (es producción) |

Con estas 4 capas activas, un chat muerto cuesta minutos, no meses.
