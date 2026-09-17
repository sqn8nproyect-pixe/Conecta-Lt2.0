# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-17 02:15 UTC
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1
**Idioma:** SIEMPRE español con el dueño — regla permanente §3.9 del PROTOCOL.md (pedido del dueño)

**Estado del workspace:** 🟢 SEGURO + GEO + LEGAL al día, TODO en producción (main = `f53a1f4`).
- **8.14 multitarjeta**: vivo (chunk a65c87fc739e3bc5.js, basis-auto).
- **8.15 GEO** (`b58637b`): /llms.txt dinámico (estándar llmstxt.org: 33 locales + guías + "cómo citar", ISR 1h), robots.ts con 17 bots de IA explícitos, JSON-LD WebSite+Organization en layout. Sitemap dinámico verificado (37 URLs).
- **8.16 legal** (`b4f9a52`): Privacidad/Términos/Quiénes Somos actualizados (cookie age-verified 30d — antes decía sessionStorage, Cloudflare R2 en terceros, carta digital + guías + PUBLICIDAD en Términos §2, derechos de imágenes §6, 5→7 capas de valor). Fecha: 17 sep 2026.
- **8.17 seguridad** (`0e83825`): Next.js 16.1.3→**16.3.5** (~35 CVEs cerradas; build local completo OK con PG embebida), 6 cabeceras de seguridad en next.config.ts (CSP frame-ancestors/object-src/base-uri, XFO DENY, nosniff, referrer, permissions-policy, COOP allow-popups), 5 rutas /api/diagnose-auth/* ahora exigen ADMIN (verificado 401 anónimo en producción; antes db-schema respondía 200 público). Audit: sin secrets en repo, requireRole en 42 rutas, uploads presign con whitelist mime.
- **SEO off-site**: Bing Webmaster ya registrado vía IMPORT de Google Search Console (dueño lo hizo solo, sin meta tag; GSC ya existía). Sitemap enviado pendiente de confirmar en panel. URL Inspection Bing: "Descubierto pero no rastreado" = normal, esperar 1-2 semanas.
- Fix botón ✕ móvil pushado y verificado (d334660, CSS pointer-fine en producción, chunk 9e6e99b1aa6d9e31.css).

**Tareas en esta sesión:** 6 (push fix botón · respuesta sitemap · GEO · guía Bing · legal · auditoría+remediación seguridad) + protocolo cierre.

**Siguiente paso acordado:** métricas de anuncios (vistas/clics/CTR) y paquetes de venta cuando haya 2-3 anunciantes. Fase 2 seguridad cuando el dueño diga (rate limit reseñas/reservas, Zod, bun update libs transitivas, CSP completa report-only).

**Pendientes del usuario (dueño):**
- Rotar NEXTAUTH_SECRET/AUTH_SECRET en Vercel + Redeploy (arrastrado desde 18-Ago; repetido esta sesión)
- **REVOCAR el PAT actual** (`couWy…LaUBo`) — 5/5 pushes de la sesión ya hechos
- (Recomendado) Rotar contraseña Neon y llaves R2 — expuestas en PROTOCOL.md v1 del historial git
- Datos: IG Africa Burguers · IG Licobar JJ (@puntoencuentrolt) · dirección real de Medusa
- Confirmar en Bing "Mapas del sitio" que sitemap.xml quedó registrado; en unos días repetir "Solicitar indexación"

**Gotchas activos:**
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI/node (el shell pisa `.env` con SQLite vieja). Standalone local: `set -a; source .env; set +a; NODE_ENV=production PORT=3100 bun .next/standalone/server.js`
- El sandbox mata procesos background entre tool calls: server + test en la MISMA llamada bash (la PG embebida 5433 también muere — arrancarla y usarla en la misma llamada)
- `bun -e` falla con Prisma (engines) — usar archivos `bun scripts/x.ts`
- AgeGate (cookie 30d) bloquea browser headless: aceptarlo antes de probar la SPA
- `NEXT_PUBLIC_*` se hornean en build: cambiarlos en Vercel exige Redeploy
- Verificar despliegue SIN API GitHub (rate-limit): grepear chunks/_next servidos por conectalt.com. CLAVES: MenuTab/OwnerDashboard NO aparecen en HTML público (cargan con sesión) → verificar CSS global (pointer-fine etc. en /_next/static/chunks/*.css); texto de AboutPage/LegalPage sí va en chunk principal del home
- Browser E2E (agent-browser): `find role … --name`; fill NO persiste en input date/time; Escape cierra el Radix Dialog completo; pausar autoplay del carrusel con `mouseover` (mouseenter NO delega en React); flechas embla por sr-only "Next slide"; scripts: `scripts/e2e-events-db.ts` + `preview-multicard.sh`
- Restore de snapshot borra archivos NO trackeados (`.env` ya se perdió 2 veces) — RECOVERY.md paso 6
- Preview local sin Neon: `bash scripts/preview-run.sh` (PG embebida /home/z/preview-pg, todo en UNA llamada). Radix Tabs exige click real
- Auth.js v5: el fix del check `iss` de Google es el `customFetch` en `src/lib/auth.ts` — NO reintroducir patch-openid-client.js (eliminado)
- npm audit exige package-lock (proyecto usa bun.lock): `npm i --package-lock-only --ignore-scripts` → auditar → `rm package-lock.json`
