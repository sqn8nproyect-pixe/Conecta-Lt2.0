# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-16 20:40 UTC
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1

**Estado del workspace:** 🟡 Sprint 8.12 (carrusel de publicidad) COMPLETO en commit local `e83e175` — **push bloqueado: esperando PAT nuevo** (el anterior fue revocado por el dueño, como se acordó). Preview validada en sandbox con PostgreSQL embebida + datos de ejemplo: carrusel con autoavance 5s, vistas/clics contando, tab "Publicidad" del panel y formulario verificados → capturas en `download/preview-sprint-8.12/` (5 PNG). Nada subido a producción.

**Tareas en esta sesión:** 3 (sprint 8.12 código · auto-heal git en boot · preview visual)

**Siguiente paso acordado:** al recibir el PAT (`conecta-push-8.12`, repo, 7 días): `git push origin main` → esperar ~2 min → curl `GET /api/ads` (debe dar `{"ads":[]}`) y `GET /` → worklog + borrar `scripts/preview-*.ts|sh` → responder al dueño con guía del primer anuncio + recordatorio de revocar PAT.

**Pendientes del usuario (dueño):**
- Rotar NEXTAUTH_SECRET/AUTH_SECRET en Vercel + Redeploy (arrastrado desde 18-Ago)
- (Recomendado) Rotar contraseña Neon y llaves R2 — expuestas en PROTOCOL.md v1 del historial git
- Datos: IG Africa Burguers · IG Licobar JJ (@puntoencuentrolt) · dirección real de Medusa
- Revocar PAT al cerrar cada sesión que lo use (patrón PAT temporal)

**Gotchas activos:**
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI/node (el shell pisa `.env` con SQLite vieja). Standalone local: `set -a; source .env; set +a; NODE_ENV=production PORT=3100 bun .next/standalone/server.js`
- El sandbox mata procesos background entre tool calls: server + test en la MISMA llamada bash
- `bun -e` falla con Prisma (engines) — usar archivos `bun scripts/x.ts`
- AgeGate (cookie 30d) bloquea browser headless: aceptarlo antes de probar la SPA
- `NEXT_PUBLIC_*` se hornean en build: cambiarlos en Vercel exige Redeploy
- Browser E2E (agent-browser): `find role … --name`; fill NO persiste en input date/time (usar setter nativo + dispatch); Escape cierra el Radix Dialog completo; scripts listos: `scripts/e2e-events-db.ts` + `e2e-events-visual.sh` + `cleanup-e2e-event.ts`
- Restore de snapshot borra archivos NO trackeados (`.env` ya se perdió 2 veces) — RECOVERY.md paso 6
- Preview local sin Neon: `bash scripts/preview-run.sh` (Postgres embebida en /home/z/preview-pg, todo-en-uno en UNA llamada). El shell inyecta DATABASE_URL SQLite → el script la pisa con `export`. Radix Tabs exige click real (agent-browser `find role tab`), no el.click().
- Auth.js v5: el fix del check `iss` de Google es el `customFetch` en `src/lib/auth.ts` — NO reintroducir patch-openid-client.js (eliminado)
