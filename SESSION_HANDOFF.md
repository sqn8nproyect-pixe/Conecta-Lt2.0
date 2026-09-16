# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-17 00:20 UTC
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1
**Idioma:** SIEMPRE español con el dueño — regla permanente §3.9 del PROTOCOL.md (pedido del dueño)

**Estado del workspace:** 🟢 Sprint 8.14 — CARRUSEL MULTITARJETA EN PRODUCCIÓN (`31def81`, chunk a65c87fc739e3bc5.js: basis-auto + hint nuevo, sin blur). El dueño rechazó el fondo difuminado y pidió carrusel multitarjeta: cada anuncio es una tarjeta independiente con su PROPORCIÓN ORIGINAL (altura fija h-150/190/230 + w-auto, sin blur, sin object-cover); varias tarjetas en fila, flechas a los lados, drag táctil (embla align:'start', loop >1 anuncio). AdsTab sin capas blur + hint "se muestra completa, en su proporción original". Verificado localmente con 6 anuncios demo (3 realistas + 3 de marco en proporciones extremas): capturas `download/carrusel-multitarjeta/` (5 PNG desktop/móvil/anuncio-único); regenerable `bash scripts/preview-multicard.sh`. Truco E2E: pausar autoplay con 'mouseover' (mouseenter NO delega en React) y localizar flechas por sr-only "Next slide" (sin aria-label). PAT #3 volvió a usarse para este push (dueño lo reenvió) — REVOCAR YA y pedir uno nuevo si hace falta. Variantes A/B/C rechazadas quedan como docs (`a9be9fc`, `ba479f9`).

**Tareas en esta sesión:** 3 (sprint 8.12 código · auto-heal git en boot · preview visual)

**Siguiente paso acordado:** dueño valida el multitarjeta en producción con sus 3 anuncios reales. Luego métricas y paquetes de venta; ver métricas (vistas/clics/CTR) y sugerir paquetes de venta (semanal/quincenal) cuando haya 2-3 anunciantes.

**Pendientes del usuario (dueño):**
- Rotar NEXTAUTH_SECRET/AUTH_SECRET en Vercel + Redeploy (arrastrado desde 18-Ago)
- (Recomendado) Rotar contraseña Neon y llaves R2 — expuestas en PROTOCOL.md v1 del historial git
- Datos: IG Africa Burguers · IG Licobar JJ (@puntoencuentrolt) · dirección real de Medusa
- Revocar PAT al cerrar cada sesión que lo use (patrón PAT temporal — el dueño ya lo aplica: 2/2 revocados a tiempo)
- `9bd49e4`+`17a22fc`+docs ya pushados en `e184306`

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
