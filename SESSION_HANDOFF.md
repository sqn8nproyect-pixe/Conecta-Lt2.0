# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-21 — boot con recovery: restore del sandbox retrocedió al 17-sep; Resumen Ejecutivo v2 rescatado del commit dangling ecb9228 (re-commit f74f135); Manual v1/v2 perdidos en disco (regenerables); PG embebida reinstalada + preview-run.sh recreado
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1
**Idioma:** SIEMPRE español con el dueño — regla permanente §3.9 del PROTOCOL.md (pedido del dueño)

**Estado del workspace:** 🟢 SEGURO + GEO + LEGAL al día, TODO en producción. GitHub 100% sincronizado con local (17-sep, push de docs con PAT temporal).
- **8.14 multitarjeta**: vivo (chunk a65c87fc739e3bc5.js, basis-auto).
- **8.15 GEO** (`b58637b`): /llms.txt dinámico (33 locales + guías + "cómo citar", ISR 1h), robots.ts con 17 bots IA, JSON-LD WebSite+Organization, sitemap dinámico (37 URLs).
- **8.16 legal** (`b4f9a52`): Privacidad/Términos/Quiénes Somos al día (cookie age-verified 30d, R2, carta digital + guías + PUBLICIDAD, 5→7 capas). Fecha: 17 sep 2026.
- **8.17 seguridad** (`0e83825`): Next.js **16.3.5** (~35 CVEs cerradas), 6 cabeceras de seguridad, /api/diagnose-auth/* solo ADMIN (401 re-verificado hoy).
- **SEO off-site**: Bing Webmaster registrado vía IMPORT de GSC; sitemap enviado pendiente de confirmar en panel.
- Fix botón ✕ móvil pushado y verificado (d334660, CSS pointer-fine en producción).
- **Verificación 2026-09-17**: / · /llms.txt · /sitemap.xml · /robots.txt · /api/ads → todos 200; CSP+XFO+HSTS presentes; working tree limpio; sin secrets trackeados.

**Siguiente paso acordado:** métricas de anuncios (vistas/clics/CTR) y paquetes de venta cuando haya 2-3 anunciantes. Fase 2 seguridad cuando el dueño diga (rate limit reseñas/reservas, Zod, bun update libs transitivas, CSP completa report-only).

**Pendientes del usuario (dueño):**
- Rotar NEXTAUTH_SECRET/AUTH_SECRET en Vercel + Redeploy (arrastrado desde 18-Ago)
- (Recomendado) Rotar contraseña Neon y llaves R2 — expuestas en PROTOCOL.md v1 del historial git
- Datos: IG Africa Burguers · IG Licobar JJ (@puntoencuentrolt) · dirección real de Medusa
- Confirmar en Bing "Mapas del sitio" el sitemap; en unos días repetir "Solicitar indexación"
- REVOCAR el PAT usado el 17-sep (push de documentación ya completado) — github.com/settings/tokens

**Gotchas activos:**
- embedded-postgres beta.17: la clase va en `.default` y hay que requerir `dist/index.js` exacto (require de directorio falla con MODULE_NOT_FOUND fantasma). Levantar PG: `bash scripts/preview-run.sh`
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI/node (el shell pisa `.env`). `.env` actual = PG embebida 127.0.0.1:5433. Standalone: build local con `bun run build` (ya setea BUILD_STANDALONE=1); correr: `set -a; source .env; set +a; NODE_ENV=production PORT=3100 bun .next/standalone/server.js`
- El sandbox mata procesos background entre tool calls: server + test en la MISMA llamada bash (la PG embebida 5433 también muere — arrancarla y usarla en la misma llamada)
- `bun -e` falla con Prisma (engines) — usar archivos `bun scripts/x.ts`
- AgeGate (cookie 30d) bloquea browser headless: aceptarlo antes de probar la SPA · `NEXT_PUBLIC_*` se hornean en build (cambiarlos en Vercel exige Redeploy)
- Verificar despliegue SIN API GitHub: grepear chunks/_next de conectalt.com. MenuTab/OwnerDashboard NO van en HTML público → verificar CSS global; AboutPage/LegalPage sí van en chunk del home
- Browser E2E: pausar autoplay con `mouseover` (mouseenter NO delega en React); flechas embla por sr-only "Next slide"; `find role … --name`; fill NO persiste en input date/time; Escape cierra Radix Dialog
- Restore de snapshot borra archivos NO trackeados (`.env` perdido ×2) — RECOVERY.md paso 6
- Preview local sin Neon: `bash scripts/preview-run.sh` (PG embebida, todo en UNA llamada) · Radix Tabs exige click real · npm audit: `npm i --package-lock-only --ignore-scripts` → auditar → borrar package-lock
- Auth.js v5: fix `iss` de Google = `customFetch` en `src/lib/auth.ts` — NO reintroducir patch-openid-client.js (eliminado)
