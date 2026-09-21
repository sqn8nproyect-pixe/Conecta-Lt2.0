> ℹ️ El historial antiguo está en `worklog-archivo-2026-09.md`
> (último re-archivado: 2026-09-21 — 10 entradas movidas).
> Leer la COLA de ese archivo para contexto antiguo; la COLA de worklog.md para lo reciente.

---
Task ID: verificacion-protocolo-2026-09-17
Agent: Super Z (principal)
Task: El dueño pidió revisar que ayer se actualizó y guardó todo como indica el protocolo.

Work Log:
- VERIFICADO (git): worklog.md con las 10 entradas (cierre 8.18 incluido), SESSION_HANDOFF.md al día, commit de cierre ca3e934 SÍ está en origin/main. Working tree limpio, sin secrets trackeados (solo .env.example en git).
- VERIFICADO (curl): producción 5/5 rutas 200 (/, /llms.txt, /sitemap.xml, /robots.txt, /api/ads); CSP frame-ancestors + XFO DENY + HSTS presentes; /api/diagnose-auth/db-schema → 401 anónimo.
- Hallazgo 1: 1 commit local sin push (9aa77f4, docs del boot post-snapshot: .env→PG embebida, archive worklog 27→10, PROJECT_STATUS). Push falló sin PAT: el repo es público (ls-remote funciona sin credenciales, push no). Pendiente PAT temporal.
- Hallazgo 2 (drift interno en PROJECT_STATUS.md, corregido per §3.7): stack decía Auth v4 + patch-openid-client "CRÍTICO" (realidad: v5 beta.32, patch eliminado — verificado con package.json y ls); gotcha #9 decía .env SQLite (realidad verificada: PG embebida 127.0.0.1:5433); item pendiente "Migrar a v5" ya hecho el 10-Sep; HEAD reflejaba ca3e934 sin el commit local.
- SESSION_HANDOFF.md reescrito a 40 líneas exactas (pasaba de 42): push pendiente marcado arriba, verificación de hoy añadida, gotchas compactados sin perder ninguno.

Stage Summary:
- Cierre de ayer CONFIRMADO completo y en GitHub; producción verde y segura.
- Único pendiente operativo: push de los commits de documentación (9aa77f4 + este) cuando el dueño dé un PAT temporal (después revocarlo).

---
Task ID: push-docs-2026-09-17
Agent: Super Z (principal)
Task: Push de los commits de documentación pendientes con el PAT temporal que envió el dueño.

Work Log:
- Push OK con PAT: 2 commits de docs subidos (boot post-snapshot 9aa77f4 + verificación de protocolo c3e7f10). Output redactado; remote restaurado a URL limpia inmediatamente después del push.
- SESSION_HANDOFF.md y PROJECT_STATUS.md actualizados: retirado el aviso de push pendiente; nuevo pendiente del dueño = REVOCAR este PAT.
- Verificado tras el push: HEAD == origin/main, working tree limpio.

Stage Summary:
- GitHub 100% sincronizado con el local; cero commits pendientes.
- Recordar al dueño: revocar el PAT en github.com/settings/tokens.

---
Task ID: vercel-function-storage-2026-09-17
Agent: Super Z (principal)
Task: Advertencia de Vercel — 75% del Function Storage gratuito (10 GB) consumido.

Work Log:
- Investigación local (protocolo §1: evidencia, no memoria): 75 rutas API = 75 funciones serverless por deployment; Prisma CLI (67 MB) estaba en DEPENDENCIES (se empaqueta en las funciones) en vez de devDependencies; output:"standalone" duplicaba el bundle en cada build de Vercel; ~206 commits/pushes desde el 15-Ago = ~206 deployments retenidos.
- Fix 1: "prisma" movido a devDependencies (vercel.json usa installCommand "bun install" que instala también devDeps → "prisma generate" del buildCommand sigue funcionando). @prisma/client permanece en dependencies.
- Fix 2: output:"standalone" ahora condicional a BUILD_STANDALONE=1. vercel.json NO lo setea (build de Vercel normal, sin bundle duplicado); el script local "build" ya lo setea (BUILD_STANDALONE=1 next build) → scripts E2E con .next/standalone/server.js siguen intactos.
- package.json validado (JSON ok) + tsc de next.config.ts ok.
- Pendiente del dueño (acción principal): purgar deployments viejos en Vercel (panel o vía API con token temporal) — ahí vive el grueso de los GB acumulados.
- Pendiente: PAT para push + deploy de los fixes.

Stage Summary:
- Causas del consumo identificadas con evidencia; correcciones de build listas en local (commit sin push).
- Siguiente optimization opcional: Prisma con driver adapter (@prisma/adapter-neon, elimina el engine de ~40 MB por función) y consolidar rutas API.

---
Task ID: vercel-purge-2026-09-17
Agent: Super Z (principal)
Task: Limpieza del Function Storage de Vercel (75% de 10 GB usado) con el token temporal del dueño.

Work Log:
- Token team-scoped (no lista equipos): el teamId se obtiene del accountId del proyecto (team_xnrW6XmHDSfNWTNJcxF4QzVI). Proyecto conecta-lt2-0 = prj_yZ81u5SXdIvXpsngw0cEHrVMxclH.
- Nuevo scripts/vercel-purge.mjs (sin secrets; token por env): modos list y purge; conserva los 5 deployments más recientes, borra el resto con rate-limit amable (150ms) y reintento 429.
- Inventario: 107 deployments retenidos (104 READY + 3 ERROR). PURGA: 102 borrados, 0 fallos, 5 conservados (incluye el production actual de 15:38).
- Producción verificada tras la purga: / y /api/ads → 200. Sin downtime.
- El dueño puede confirmar la caída de uso en el panel de Vercel (Usage) — la métrica puede tardar un poco en refrescar.
- Pendiente: PAT para push del commit dd6a8c3 (funciones más livianas) + sugerencia de retención corta en Settings del proyecto.

Stage Summary:
- 102 deployments purgados de 107; Function Storage liberado (confirmar cifra en panel). Script reutilizable para futuras limpiezas.

---
Task ID: vercel-storage-deploy-2026-09-17
Agent: Super Z (principal)
Task: Push de los fixes de Function Storage + verificación del deployment en producción.

Work Log:
- Push con PAT (el mismo del inicio del día, sigue activo): ca6d999..20137db (2 commits: dd6a8c3 fixes de storage + 20137db script de purga). Remote restaurado limpio.
- Deployment nuevo verificado vía API de Vercel: dpl_68xM5TXqGn58bDDmzDyD5FVAc2U5 READY, target=production, 16:24 UTC — construido SIN output standalone y SIN prisma CLI en dependencies (funciones más livianas).
- Producción: / y /local → 200.
- Cadena completa del día: advertencia 75% de 10 GB → diagnóstico con evidencia (prisma CLI empaquetado + standalone duplicado + 107 deployments retenidos) → purga de 102 deployments (0 fallos) → fixes de build en producción.
- Deuda con el dueño: REVOCAR el PAT de GitHub (sigue activo; ya se usó en 2 sesiones) + el token de Vercel (si puso 1 day, vence solo) + poner Retention corto en Vercel.

Stage Summary:
- Funciones más livianas EN PRODUCCIÓN; storage purgado. El uso real se confirma en el panel de Vercel (Usage) cuando refresque la métrica.

---
Task ID: resumen-ejecutivo-pdf-2026-09-18
Agent: Super Z (principal)
Task: El dueño pidió un resumen ejecutivo en PDF descargable.

Work Log:
- Preguntas de alcance al dueño: cobertura = estado completo, audiencia = solo dueño, extensión 2-3 páginas, estilo corporativo claro (azul marino + teal), imprescindible = métricas Vercel, con gráficos, tono ejecutivo.
- Pipeline skill pdf ruta Report: paleta cascade (intent cold, seed 11, azul marino #405f6f + acento #227fad); portada Template 01 HUD (HTML → html2poster.js 794px, validada con poster_validate + cover_validate sin colisiones); gráfico de barras matplotlib (deployments 107 → 5, reglas charts.md); cuerpo ReportLab (FreeSerif, 4 secciones numeradas, 2 callouts de métricas, 2 tablas, figura 1); fusión pypdf normalizada a A4 exacto.
- QA final: pdf_qa.py PASS 12/12, font.check 0 issues, sin páginas en blanco, fill ratio OK.
- Entregados: download/Resumen_Ejecutivo_ConectaLT_2026-09-18.pdf (4 páginas, 171 KB) + download/resumen_ejecutivo_portada.html (fuente editable). Scripts reutilizables en scripts/ (gen_chart_vercel.py, gen_resumen_body.py, merge_resumen.py, resumen_cover.html).

Stage Summary:
- Resumen ejecutivo entregado y descargable; contenido basado en PROJECT_STATUS/SESSION_HANDOFF/worklog (fuente de verdad), con cierre del incidente Vercel como sección destacada y agenda del dueño en tabla.

---
Task ID: manual-implementacion-pdf-2026-09-18
Agent: Super Z (principal)
Task: El dueño pidió un manual de implementación en PDF descargable para usuarios, dueños y administradores, con capturas de pantalla reales, que cubra qué es ConectaLT, tecnologías, escalabilidad, alcance, funciones y beneficios.

Work Log:
- Pipeline skill pdf ruta Creative Flow (manual/handbook): paleta cascade intent cold seed 11 (idéntica al resumen ejecutivo: azul marino #405f6f + acento #227fad), portada Template 01 HUD inline (línea ancla 8px + grid 5%), tipografías Inter + Playfair Display, página A4 794×1123px, margen 0.
- 21 CAPTURAS REALES: 18 en vivo desde conectalt.com con agent-browser (AgeGate, home desktop, directorio 33 locales, ficha SEO + interactiva de Bodegón Bicentenario y Licobar JJ, mapa Explorador de Rumba, Night Planner paso 1 + resultados con score 79%, modal login, aforo tiempo real, promoción PUNTO24, carta digital, guía editorial 12 flyers, home/ficha móvil 390×844, carrusel de anuncios + Populares) + 3 del repo (panel admin y Eventos de e2e-shots, perfil real de Ana Rodríguez stage2). Login demo de producción NO disponible (Google-only); panel del dueño documentado con tabla funcional + capturas de contexto.
- Datos reales verificados vía API/producción: 33 locales (13 licorerías, 7 tascas, 7 discotecas, 6 licobares), 116 reseñas, 7 ofertas activas, 12 eventos semanales, sitemap 37 URLs, 42 rutas RBAC, Next 16.3.5, incidente storage Vercel (102 purgados) en sección escalabilidad.
- Estructura: portada + índice + 10 secciones (qué es, alcance, tecnologías/arquitectura+seguridad+GEO, escalabilidad, funciones/beneficios por rol, guía usuarios 6.1-6.8, guía dueños 7.1-7.4 con pasos de reclamo, guía administradores 8.1-8.3, plan de implementación fases 0-4 + matriz de responsables, soporte/recursos/FAQ + glosario) + contraportada navy.
- BUGS RESUELTOS: (1) Google Fonts no cargaba en Chromium del skill → fuentes variables woff2 NO se incrustan en page.pdf (fallback Liberation Sans) → solución: TTF estáticas latin descargadas y embebidas como data-URI base64 (7 fuentes embebidas verificadas con PyMuPDF); (2) Paged.js timeout con data-URIs → --nopaged (paginación nativa Chromium, el doc no usa features de Paged.js); (3) página huérfana con solo el aviso → aviso movido a contraportada + glosario de 10 términos llenó la última página (~45%); (4) cover_validate sobre todo el documento (falsos positivos en divisores) → portada renombrada .portada (alcance cover_validate = solo portadas Report/Academic) y gap real línea↔texto corregido 32→42px.
- QA: poster_validate PASS 0/0; pdf_qa.py 10 pasados, 2 warnings por diseño (asimetría portada Template 01 anclada a izquierda, línea corta p19); numeración pagination.md (portada sin nº, TOC "i", cuerpo 1-19, contraportada sin nº) estampada con PyMuPDF; metadatos Title/Author/Subject; 0 caracteres corruptos.
- Entregables en download/manual-implementacion/: Manual_Implementacion_ConectaLT_2026-09-18.pdf (22 páginas, 7.8 MB, vectorial, texto seleccionable), manual-implementacion-conectalt.html (fuente editable), capturas/ (21 PNG reales), fonts/ (TTF para re-edición). Scripts reutilizables: scripts/build_fonts_ttf.py, scripts/manual_pagenum_meta.py.

Stage Summary:
- Manual de implementación entregado y descargable, con capturas reales de producción (escritorio + móvil, público + paneles) y datos verificados contra la API de conectalt.com al 18-sep.
- Sin cambios en el repo del proyecto (ni commit ni push); el manual se genera desde esta sesión con scripts persistidos.
- Pendiente del dueño (sin cambios): rotar NEXTAUTH_SECRET, revocar PATs usados, datos de anunciantes.

---
Task ID: manual-usuario-v2-pdf-2026-09-18
Agent: Super Z (principal)
Task: El dueño adjuntó el Manual de Usuario v1.0 (agosto 2026, 31 págs) y pidió: actualizarlo con todas las características nuevas, hacerlo más visual con capturas de pantalla reales, e incluir que ConectaLT fue realizado por Sebastián Quintana, CEO de la agencia de automatizaciones Cerotraba.

Work Log:
- Base documentada: PDF adjunto extractado (12 capítulos v1.0) + datos reales verificados en producción (33 locales: 13 licorerías/7 tascas/7 discotecas/6 licobares; ads API con anuncio de Cerotraba; guía editorial activa). Fuente de verdad: SESSION_HANDOFF/PROJECT_STATUS/worklog.
- Ruta Creative Flow (skill pdf): pipeline reutilizado del manual anterior (fonts TTF data-URI Inter+Playfair, html2pdf-next.js --nopaged, A4 794×1123px). Identidad v1.0 preservada y elevada: azul noche + dorado/cian, Playfair Display para display.
- CONTENIDO NUEVO v2.0: 17 capítulos renumerados + créditos. Correcciones a v1.0: verificación de edad por cookie 30 días (v1.0 decía sessionStorage, desactualizado), login Google-only (demo no disponible en producción), métricas 21→33 locales. Añadidos: Cap 02 Tecnología (Next 16.3.5, Neon, R2, GEO/llms.txt/17 bots IA, 42 rutas RBAC), Cap 03 Alcance/Escalabilidad (con barras 107→5 del incidente Vercel), carta digital, aforo tiempo real, Night Planner v2 (6 pasos, score), guías editoriales, carrusel multitarjeta, panel dueño completo (tabla 7 secciones), seguridad/legal 17-sep, FAQ actualizada, Cap créditos.
- 20 CAPTURAS REALES reutilizadas de download/manual-implementacion/capturas/ (optimizadas PNG→JPEG q88, 7.3→2.1 MB), en marcos de navegador con barra URL + 2 móviles 390px.
- Crédito Cerotraba en 3 puntos: tarjeta en portada con logo, hero en página de créditos con tabla de soporte, contraportada. Logo logo-cerotraba.png embebido data-URI.
- FIXES de paginación (3 iteraciones con hoja de contacto + mapa de texto por página): 37→34→32→29 págs; eliminadas 7 páginas huérfanas (llamouts convertidos a párrafos, reorden shot-row antes de h3, break-before dirigido en cap12/cap15, teléfonos ampliados 196→222px + párrafo mobile-first).
- QA: poster_validate (errores solo falsos positivos de @font-face), cover_validate (gap portada corregido 22→54px; resto falsos positivos de bordes h3 en cuerpo), pdf_qa.py 10 passed / 2 warnings cosméticos (raya a inicio de línea, tipografía ES aceptable), font.check 0 issues, sin páginas vacías, fuentes embebidas.
- Numeración pagination.md (portada sin nº, TOC "i", cuerpo 1-26, contraportada sin nº) + metadatos con Author "Sebastián Quintana · Cerotraba". Scripts persistidos en scripts/manual_v2/ (setup, assemble, pagenum_meta, 7 partes HTML).

Stage Summary:
- Entregado download/manual-implementacion-v2/: Manual_Usuario_ConectaLT_v2_Septiembre2026.pdf (29 págs, 3.2 MB, vectorial, texto seleccionable, 20 capturas reales) + manual-usuario-conectalt-v2.html (fuente editable con fuentes embebidas) + capturas/ + fonts/.
- v2.0 = v1.0 actualizado: todas las características ago-sep documentadas, diseño visual (marcos navegador, KPIs, tarjetas, callouts, barras comparativas) y crédito Cerotraba/Sebastián Quintana visible en portada, créditos y contraportada.
- Sin cambios en el repo del proyecto; pendientes del dueño sin cambios (rotar NEXTAUTH_SECRET, revocar PATs, datos anunciantes).

---
Task ID: resumen-ejecutivo-v2-pdf-2026-09-18
Agent: Super Z (principal)
Task: Actualizar el Resumen Ejecutivo anterior con todas las características nuevas, rediseñarlo más visual con capturas de pantalla reales e incluir el crédito de que ConectaLT fue realizado por Sebastián Quintana, CEO de la agencia de automatizaciones Cerotraba. Cierre de sesión: "activa el protocolo, carga todo, revisa y guarda".

Work Log:
- Contexto recuperado (worklog, PROJECT_STATUS, SESSION_HANDOFF) y skill pdf cargado; datos re-verificados contra producción vía API: 33 locales activos (13 licorerías, 7 tascas, 7 discotecas, 6 licobares). Reseñas (116), promos activas (7) y eventos semanales (12) tomados del trabajo verificado del 18-sep (endpoints públicos requieren sesión).
- Ruta Creative Flow reutilizando el pipeline probado del manual v2: fonts TTF data-URI Inter+Playfair, html2pdf-next.js --nopaged, A4 794×1123px, identidad azul noche + dorado/cian.
- Setup scripts/resumen_v2/setup.py: download/resumen-ejecutivo-v2/ con capturas/ (21 JPEG q88, 2.1 MB), fonts/ y logo cerotraba.b64.
- Contenido v2.0 (16 págs): portada con tarjeta de crédito Cerotraba/Sebastián Quintana + índice + 7 secciones (01 panorama con KPIs 33 locales/+6.000 eventos/116 reseñas/12 eventos; 02 novedades con NUEVO: Night Planner v2, carta digital, aforo tiempo real, cupones, guías editoriales, carrusel multitarjeta, mapa corregido, cookie 30d; 03 incidente Vercel 107→5 con barras y KPIs 102/0/-95%/7 días; 04 seguridad Next 16.3.5, 42 rutas RBAC, tabla pendientes del dueño; 05 SEO/GEO sitemap 37, llms.txt, 17 bots IA, Bing; 06 paneles dueño/admin + tabla RBAC por rol; 07 próximos pasos: agenda del dueño + métricas de anuncios + Fase 2 + driver Neon) + créditos (hero Cerotraba) + contraportada.
- 14 capturas reales incrustadas en marcos de navegador con barra URL; crédito en 3 puntos: portada, página de créditos y contraportada.
- FIXES de paginación (2 iteraciones con mapa de contacto PyMuPDF): 17→16 págs; eliminada página huérfana p04 (texto recortado + Figura 1 a 600px) y p14 medio vacía llenada con tabla RBAC por rol.
- QA: poster_validate solo falsos positivos @font-face; pdf_qa.py PASS 12/12 (fuentes embebidas, sin páginas vacías, sin overflow, llenado adecuado, márgenes simétricos); font.check 0 issues; numeración pagination.md (portada sin nº, TOC "i", cuerpo 1-14, contraportada sin nº); metadatos con Author "Sebastián Quintana · Cerotraba"; acentos españoles verificados; crédito confirmado en 3 puntos (letter-spacing de contraportada solo separa al extraer, no es error).
- Commit local de docs/entregables; SIN push (el dueño debe revocar el PAT del 17-sep primero; rotar NEXTAUTH_SECRET sigue pendiente).

Stage Summary:
- Entregado download/resumen-ejecutivo-v2/: Resumen_Ejecutivo_ConectaLT_v2_Septiembre2026.pdf (16 págs, 2.4 MB, A4 vectorial, texto seleccionable, 14 capturas reales) + resumen-ejecutivo-conectalt-v2.html (fuente editable) + capturas/ + fonts/.
- v2.0 = resumen ejecutivo actualizado: todas las características ago-sep documentadas, diseño visual (KPIs, tarjetas NUEVO, marcos navegador, barras comparativas, tablas) y crédito Cerotraba/Sebastián Quintana visible en portada, créditos y contraportada.
- Scripts reutilizables en scripts/resumen_v2/ (setup, assemble, pagenum_meta, contact_sheet + 6 partes HTML).
- Sin cambios en el repo del proyecto. Pendientes del dueño sin cambios: rotar NEXTAUTH_SECRET, revocar PAT 17-sep, rotar Neon/R2 (media), confirmar Usage Vercel y sitemap Bing, datos comerciales (IG Africa Burguers, IG Licobar JJ, dirección Medusa).

---
Task ID: boot-recovery-snapshot-2026-09-21
Agent: Super Z (principal)
Task: "boot" — arranque de sesión. El health check reveló que el restore del sandbox retrocedió el repo a un snapshot del 17-sep, borrando los entregables del 18-sep y rompiendo .env/PG embebida.

Work Log:
- Diagnóstico: HEAD local = 6eadbe2 (17-sep); commit ecb9228 (Resumen Ejecutivo v2) y todo download/manual-implementacion* ausentes del disco; /home/z/preview-pg (PG embebida, fuera del repo) también perdida.
- RESCATE GIT: ecb9228 sobrevivió como commit dangling (.git preservó objetos, refs retrocedieron). Localizado con git fsck --no-reflogs --lost-found y recuperado con `git checkout ecb9228 -- download/resumen-ejecutivo-v2 scripts/resumen_v2 scripts/pdf_assets/resumen_v2_grid.png worklog.md`; re-commiteado como f74f135. PDF verificado: 16 págs, 2.43 MB, metadatos y numeración intactos.
- Pérdida IRRECUPERABLE de git: Manual de Implementación v1 y Manual de Usuario v2 (download/manual-implementacion/ y manual-implementacion-v2/ + scripts/manual_v2/) — nunca se commitearon. Regenerables bajo pedido: v2 vía pipeline reutilizable (las capturas optimizadas viven dentro del resumen recuperado en download/resumen-ejecutivo-v2/capturas/).
- .env reconstruido al estado documentado (PROJECT_STATUS §9): DATABASE_URL/DIRECT_URL → postgresql://postgres:postgres@127.0.0.1:5433/conectalt.
- PG embebida reinstalada en /home/z/preview-pg (npm i embedded-postgres); scripts/preview-run.sh recreado (levanta PG + espera puerto + comando opcional + trap de limpieza, todo en UNA llamada). Verificado: PG activa, prisma db push OK, tabla Business existe (BD local vacía — datos reales solo en Neon/Vercel, sin relación).
- GOTCHA nuevo documentado: embedded-postgres beta.17 exporta la clase como .default y hay que requerir dist/index.js exacto (el require de directorio falla con MODULE_NOT_FOUND fantasma).
- Worklog archivado (era de 19+1 entradas) y docs de estado actualizados (PROJECT_STATUS, SESSION_HANDOFF).

Stage Summary:
- Entregable crítico RECUPERADO: download/resumen-ejecutivo-v2/ completo (PDF + HTML + capturas + fuentes) — el dueño puede re-descargarlo.
- Workspace de nuevo operativo: git limpio y commiteado, PG embebida local lista para previews, salud verificada.
- Pendientes del dueño SIN CAMBIO: revocar PAT 17-sep, rotar NEXTAUTH_SECRET, rotar Neon/R2 (media), confirmar Usage Vercel y sitemap Bing, datos comerciales.

---
Task ID: whatsapp-float-2026-09-21
Agent: Super Z (principal)
Task: El dueño pidió un botón flotante de WhatsApp para que cualquier visitante pueda comunicarse por el número +58 422-0117206.

Work Log:
- Nuevo componente src/components/conecta/WhatsAppFloat.tsx (client): círculo verde con glifo oficial de WhatsApp (SVG inline), gradiente #2fe672→#128c4b, entrance con framer-motion (spring, delay 1.2s), onda sutil cada 4s (keyframe whatsapp-ripple en globals.css, respeta prefers-reduced-motion), tooltip desktop "¿Dudas? Escríbenos por WhatsApp" (hidden sm:block + group-hover, se oculta en táctil), aria-label/title, target _blank + rel noopener.
- Link: https://wa.me/584220117206?text=<"Hola CONECTA-LT, quiero hacer una consulta."> — número centralizado en la constante WHATSAPP_NUMBER (un solo lugar si cambia).
- Analítica: track WHATSAPP_CLICK sin businessSlug + metadata {source:'floating-button', path} vía trackAnalyticsEvent (fire-and-forget, patrón de use-analytics).
- Montado en src/app/layout.tsx (fuera de QueryProvider) → aparece en TODAS las rutas: SPA (/), fichas SEO /local/[slug], /local, /editorial, /r/[code].
- Z-index 40: sobre contenido, bajo navbar z-50, notificaciones z-60, modales z-70 y AgeGate z-100 (verificado: el botón queda detrás del gate hasta verificar edad).
- QA: tsc --noEmit sin errores en archivos nuevos (errores preexistentes de event-labels.ts ignorados por build); eslint limpio; verificación visual con agent-browser (desktop 1280 + móvil 390): botón visible, href correcto, click abre api.whatsapp.com/send/?phone=584220117206 con mensaje pre-llenado, POST /api/analytics/track disparado.
- NOTA TURBOPACK: el dev server (corriendo desde antes) no recompiló globals.css con `touch`; hizo falta un cambio real de contenido (apéndice + revert). Síntoma: clases nuevas del TSX compilaban pero el keyframe nuevo de globals.css no aparecía en el CSS servido.
- NOTA HEADLESS: agent-browser emula (hover:none, pointer:coarse) → ningún tooltip hover del sitio es demostrable ahí; el group-hover del tooltip está dentro de @media (hover: hover) y funciona en dispositivos reales con mouse. Diseño del tooltip verificado inyectando el estado final por JS.

Stage Summary:
- Botón flotante de WhatsApp global en conectalt.com con el número del dueño (+58 422-0117206), mensaje pre-llenado, animación de onda, tooltip desktop y tracking WHATSAPP_CLICK source=floating-button.
- Archivos: src/components/conecta/WhatsAppFloat.tsx (nuevo), src/app/layout.tsx (1 import + 1 montaje), src/app/globals.css (keyframe + clase + reduced-motion).
- Commit local; SIN push (el dueño aún debe revocar el PAT del 17-sep).
