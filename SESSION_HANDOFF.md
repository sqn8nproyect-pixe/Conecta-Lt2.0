# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Es la única fuente de "qué está pasando AHORA" — mantenlo al día y ningún
> chat nuevo perderá contexto jamás.

**Fecha inicio sesión:** 2026-09-10
**Última actividad:** 2026-09-10 14:35 UTC
**Tareas en esta sesión:** 3 (restauración + reconexión Neon + migración Auth.js v5)
**Chat:** segundo restore — sesión re-abierta tras muerte del chat anterior

**Estado del workspace:** 🟢 estable — local verificado E2E tras reconstruir .env. Auth.js v5 (next-auth@5.0.0-beta.32) migrado y verificado E2E (9/9 checks: login demo→JWT→sesión con role→API protegida 200/401→signout) + build producción OK. PENDIENTE PUSH (sin PAT)

**En vuelo ahora mismo:** commit local de migración v5 esperando push cuando haya PAT nuevo

**Siguiente paso acordado:** implementar PLAN-MEJORAS-ESTRUCTURALES.md (Sprints 6A-8, SEO+UX). Orden: saneamiento datos → rutas /local/[slug] → sitemap+JSON-LD → AgeGate/login → editorial. Sprint 6A listos para arrancar. Night Route queda postergada

**Pendientes del usuario:**
- Revocar PAT usado para fetch (ghp_...ler)
- Rotar contraseña Neon cuando termine de iterar (se compartió en chat)


**Gotchas activos:**
- `unset DATABASE_URL DIRECT_URL` antes de cualquier comando prisma CLI / node (el shell del sandbox pisa el .env con SQLite vieja). OJO: `unset X && cmd &` agrupa el unset en el subshell — usar `unset X; cmd &`
- El sandbox mata procesos background entre tool calls: para probar la app usar `bash scripts/smoke-test.sh` y para auth `node scripts/auth-e2e-test.js` con server lanzado en la MISMA llamada
- Auth.js v5: sesión anónima es `null` (v4 devolvía `{}`); server-side usar helpers de src/server/auth.ts, nunca auth() directo en routes
- worklog.md: 14 entradas activas + worklog-archivo-2026-09.md (123 entradas)
