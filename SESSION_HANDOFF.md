# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-16 21:25 UTC
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1
**Idioma:** SIEMPRE español con el dueño — regla permanente §3.9 del PROTOCOL.md (pedido del dueño)

**Estado del workspace:** 🟢 Sprint 8.12 (carrusel de publicidad) DESPLEGADO y verificado en producción (`29aa1cb`). 🟡 **Fix del mapa EN LOCAL sin push** (PAT revocado): el dueño reportó cuadros "Map data not yet available" al abrir mucho el mapa → causa: cuota gratuita de Esri tiles; fix = OpenStreetMap estándar + filtro CSS nocturno (globals.css) + maxZoom 19, verificado en sandbox (0 tiles rotos, capturas en `download/correccion-mapa/`, 3 PNG). Commits locales `fix-mapa-tiles` esperando PAT. Capturas del carrusel: `download/preview-sprint-8.12/`; preview mapa regenerable con `bash scripts/preview-map.sh`.

**Tareas en esta sesión:** 3 (sprint 8.12 código · auto-heal git en boot · preview visual)

**Siguiente paso acordado:** dueño crea su primer anuncio (Panel Admin → "Publicidad" → + Nuevo anuncio: arte → destino interno/externo → fechas → activo) y valida el carrusel en producción. En la próxima sesión: ver carrera de métricas (vistas/clics/CTR) con tráfico real; sugerir paquetes de venta (semanal/quincenal) cuando haya 2-3 anunciantes.

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
