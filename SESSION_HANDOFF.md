# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Es la única fuente de "qué está pasando AHORA" — mantenlo al día y ningún
> chat nuevo perderá contexto jamás.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-12 — Sprint 8.6 CERRADO Y PUSHEADO: E2E con DB real 13/13 + visual ABM completo (crear/publicar/editar/borrar) + móvil 390px OK
**Chat:** chat nuevo (workspace restaurado de snapshot; `.env` reconstruido con la cadena de Neon pegada por el dueño)

**Estado del workspace:** 🟢 `main == origin/main` (todo pusheado con el PAT nuevo). Sprint 8.6 validado de punta a punta: API `/api/admin/events` (GET/POST/PATCH/DELETE, guards 401 anónimo, validaciones 400, filtros status/weekOf) + tab "Eventos" del AdminDashboard (etiquetas y weekOf auto en horario Caracas, 12 temas, DRAFT/PUBLISHED, orden, promos). DB limpia (0 leftovers de test). El dueño YA puede cargar los flyers de la próxima semana sin tocar código.

**En vuelo:** nada.

**Siguiente paso acordado:** cadencia editorial semanal con el dueño — definir quién carga los flyers cada semana y cuándo (Admin → Eventos → Nuevo evento; la portada `/editorial` muestra la semana más reciente con ISR < 1h). Opcional: verificar en Vercel el deploy del 8.6 (NO requiere env vars nuevas).

**Pendientes del usuario (dueño):**
- Verificar en Vercel → Settings → Env Vars: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (si se cambian, Redeploy — las NEXT_PUBLIC_* se hornean en build)
- Datos pendientes de dueños: IG Africa Burguers, IG Licobar JJ (@puntoencuentrolt), dirección real de Medusa
- (Seguridad) Guardar en el gestor de contraseñas: cadena de Neon + PAT; revocar el PAT al cerrar esta sesión (patrón PAT temporal)

**Gotchas activos:**
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI/node (el shell del sandbox pisa `.env` con SQLite vieja). Standalone local: `set -a; source .env; set +a; NODE_ENV=production PORT=3100 bun .next/standalone/server.js`
- El sandbox mata procesos background entre tool calls: server + test en la MISMA llamada bash
- `bun -e` falla con Prisma (engines) — usar archivos `bun scripts/x.ts`
- AgeGate (cookie 30d) bloquea browser headless: aceptarlo antes de probar la SPA
- `NEXT_PUBLIC_*` se hornean en build: cambiarlos en Vercel exige Redeploy
- Browser E2E (agent-browser): usar `find role … --name` (find text falla); el fill NO persiste en input date/time de este Chromium (usar setter nativo + dispatch input/change); Escape cierra el Radix Dialog completo; selects bajo el scroll del dialog necesitan scrollIntoView; "Estado" default PUBLISHED — setear Borrador en tests. Scripts listos: `scripts/e2e-events-db.ts` (13 checks API) + `scripts/e2e-events-visual.sh` (flujo visual) + `scripts/cleanup-e2e-event.ts` (limpieza)
- El restore de snapshot del sandbox borra archivos NO trackeados (`.env` ya se perdió 2 veces) — RECOVERY.md paso 6 documenta la reconstrucción
- worklog.md: entradas activas + worklog-archivo-2026-09.md (archivo histórico)
