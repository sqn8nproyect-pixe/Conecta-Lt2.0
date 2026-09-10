# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Es la única fuente de "qué está pasando AHORA" — mantenlo al día y ningún
> chat nuevo perderá contexto jamás.

**Fecha inicio sesión:** 2026-09-10
**Última actividad:** 2026-09-10 13:55 UTC
**Tareas en esta sesión:** 2 (restauración chat nuevo + reconexión Neon/E2E)
**Chat:** segundo restore — sesión re-abierta tras muerte del chat anterior

**Estado del workspace:** 🟢 estable — f0d69a1 = origin/main = producción. Local verificado E2E tras reconstruir .env (Neon OK: 28 negocios, 40 users, 115 reviews, smoke test HTTP 200 en /, /api/businesses, /api/categories)

**En vuelo ahora mismo:** nada — entorno local 100% operativo

**Siguiente paso acordado:** por decidir (candidatas: Sprint 6 Night Route multi-paradas, migración Auth.js v5)

**Pendientes del usuario:**
- Revocar PAT usado para fetch (ghp_...ler)
- Rotar contraseña Neon cuando termine de iterar (se compartió en chat)


**Gotchas activos:**
- `unset DATABASE_URL DIRECT_URL` antes de cualquier comando prisma CLI / node (el shell del sandbox pisa el .env con SQLite vieja)
- El sandbox mata procesos background entre tool calls: para probar la app usar `bash scripts/smoke-test.sh` (levanta server + prueba + apaga en 1 llamada). Nunca asumir que un server sigue vivo de un tool call anterior
- worklog.md: 12 entradas activas + worklog-archivo-2026-09.md (123 entradas)
