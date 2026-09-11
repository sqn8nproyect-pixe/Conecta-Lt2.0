# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Es la única fuente de "qué está pasando AHORA" — mantenlo al día y ningún
> chat nuevo perderá contexto jamás.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-12 — Sprint 8.6 código completo, commit local pendiente de push
**Tareas de esta sesión:** Sprint 8.6 (ABM admin de flyers/eventos) + reconstrucción de contexto tras restore de snapshot
**Chat:** chat nuevo (boot ejecutado); workspace fue restaurado de snapshot viejo — `.env` perdió la cadena de Neon

**Estado del workspace:** 🟡 8.6 código COMPLETO — local `main` = `origin/main` + 1 commit local sin push. Tab "Eventos" en AdminDashboard (alta/edición/publicar/borrar flyers sin código, etiquetas y weekOf auto en horario Caracas) + API `/api/admin/events` (GET/POST) y `/[id]` (PATCH/DELETE). Validado: eslint OK, build OK, E2E sin DB 7/7 (`scripts/e2e-events-nodb.sh`). ⏳ FALTA: E2E con DB real (CRUD+visual) y push.

**En vuelo ahora mismo:** Sprint 8.6 — esperando ① cadena de Neon (DATABASE_URL pooled + DIRECT_URL) para reconstruir `.env` y correr E2E con DB; ② PAT nuevo de GitHub para push. Ambos los tiene el dueño (Neon console / chat anterior y GitHub tokens).

**Siguiente paso acordado:** al recibir credenciales: reconstruir `.env` → `bun scripts/preflight-admin-events.ts` (verifica admin+12 eventos) → E2E CRUD real de `/api/admin/events` → visual agent-browser (login admin → tab Eventos → crear/editar/borrar) → push → Vercel deploy. Luego: cadencia editorial semanal con el dueño (los flyers de la próxima semana ya se pueden cargar desde el panel sin código).

**Pendientes del usuario (dueño):**
- 🔴 PRIORITARIO HOY: pegar cadena de Neon (DATABASE_URL pooled SIN channel_binding + DIRECT_URL sin -pooler) para reconstruir `.env` — el restore del sandbox la borró
- 🔴 Generar PAT nuevo de GitHub y pegarlo en el chat para push
- Verificar en Vercel → Settings → Env Vars: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (si se cambian, Redeploy — las NEXT_PUBLIC_* se hornean en build)
- Datos pendientes de dueños: IG Africa Burguers, IG Licobar JJ (@puntoencuentrolt), dirección real de Medusa

**Gotchas activos:**
- 🔴 NUEVO: el restore de snapshot del sandbox borra archivos NO trackeados (.env ya se perdió una vez) — RECOVERY.md paso 6 documenta la reconstrucción
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI/node (shell del sandbox pisa .env con SQLite vieja). Para standalone local: `set -a; source .env; set +a; NODE_ENV=production PORT=3100 bun .next/standalone/server.js`
- `bun -e` falla con Prisma (engines) — usar archivos de script `bun scripts/x.ts`
- El sandbox mata procesos background entre tool calls: lanzar server y test en la MISMA llamada bash
- AgeGate (cookie 30d) bloquea home en browser headless: aceptarlo antes de probar la SPA
- `NEXT_PUBLIC_*` se hornean en build: cambiarlos en Vercel exige Redeploy
- worklog.md: entradas activas + worklog-archivo-2026-09.md (archivo histórico)
