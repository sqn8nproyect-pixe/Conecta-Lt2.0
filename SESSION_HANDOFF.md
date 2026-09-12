# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-12 02:46 UTC
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1

**Estado del workspace:** 🟢 `main == origin/main` tras push de hoy. Sprint 8.11b ("Limpiar semana" + revalidación instantánea de /editorial y guía + purga R2) desplegado y VERIFICADO: `DELETE /api/admin/events` → 401, `GET /editorial` → 200, guía → 200. Nada en vuelo.

**Tareas en esta sesión:** 2

**Siguiente paso acordado:** nada pendiente de código — esperar peticiones del dueño. Candidatos naturales: purga opcional de huérfanos R2; datos que el dueño debe aportar (abajo).

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
- Auth.js v5: el fix del check `iss` de Google es el `customFetch` en `src/lib/auth.ts` — NO reintroducir patch-openid-client.js (eliminado)
