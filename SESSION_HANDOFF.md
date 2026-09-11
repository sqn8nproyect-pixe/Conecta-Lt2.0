# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Es la única fuente de "qué está pasando AHORA" — mantenlo al día y ningún
> chat nuevo perderá contexto jamás.

**Fecha inicio sesión:** 2026-09-11
**Última actividad:** 2026-09-11 01:20 UTC — cierre del día, repo reconciliado y push `948e50a`
**Tareas de esta sesión:** Sprint 8.7 (portada 12 flyers), Sprint 8.8 (botón "Acceder"), reconciliación git + docs de cierre
**Chat:** sesión de cierre — arrancar mañana en CHAT NUEVO con `bash scripts/session-boot.sh`

**Estado del workspace:** 🟢 estable — `main == origin/main == 948e50a` (push verificado). Sprints 6A-8.8 implementados. Producción (Vercel, conectalt.com) sirve 8.7+8.8: portada `/editorial` = 12 flyers del 11-13 sep con modal + botón "Acceder" dorado animado que convive con el login contextual 7B (ambos abren el MISMO LoginPromptModal). Se descartó commit local duplicado d052286 (reset a origin 638a8a3, restauró `src/app/api/upload/presign/route.ts` borrado por accidente).

**En vuelo ahora mismo:** nada — todo cerrado y pusheado

**Siguiente paso acordado:** sprint 8.6 — admin ABM de posts/eventos (AdminDashboard). Antes validar con el dueño la cadencia editorial semanal (quién escribe, cuándo). Para re-seed semanal: editar `prisma/seed-weekend-events.ts` (fechas/labels) y `bun run db:seed-weekend-events` (idempotente).

**Pendientes del usuario (dueño):**
- 🔴 PRIORITARIO: revocar PAT expuesto en chats (ghp_IpjZ...wxN3) y generar uno nuevo ANTES de la próxima sesión que necesite push
- Verificar en Vercel → Settings → Env Vars: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` (si se cambian, Redeploy — las NEXT_PUBLIC_* se hornean en build)
- Datos pendientes de dueños: IG Africa Burguers, IG Licobar JJ (@puntoencuentrolt), dirección real de Medusa

**Gotchas activos:**
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI/node (shell del sandbox pisa .env con SQLite vieja). Para standalone local: `set -a; source .env; set +a; NODE_ENV=production PORT=3100 bun .next/standalone/server.js`
- El sandbox mata procesos background entre tool calls: lanzar server y test en la MISMA llamada bash
- AgeGate (cookie 30d) bloquea home en browser headless: aceptarlo antes de probar la SPA
- `NEXT_PUBLIC_*` se hornean en build: cambiarlos en Vercel exige Redeploy
- worklog.md: entradas activas + worklog-archivo-2026-09.md (archivo histórico)
