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

---
Task ID: whatsapp-footer-about-2026-09-21
Agent: Super Z (principal)
Task: El dueño aceptó agregar el número de WhatsApp también al footer y a la página "Quiénes Somos".

Work Log:
- Refactor previo: creado src/lib/contact.ts como FUENTE ÚNICA del número (CONTACT_WHATSAPP_NUMBER, CONTACT_WHATSAPP_DISPLAY, CONTACT_WHATSAPP_MESSAGE y helper waLink()) y src/components/conecta/WhatsAppIcon.tsx (glifo SVG reutilizable). WhatsAppFloat.tsx refactorizado para consumir ambos (sin cambio de comportamiento).
- Footer: enlace en la fila de links (Términos · [icono] +58 422-0117206) — discreto en reposo (white/40), verde #25d366 al hover; en móvil muestra solo "WhatsApp" (el número no cabe); whitespace-nowrap para evitar quiebre feo del número (bug v1 detectado en captura y corregido). Tracking WHATSAPP_CLICK source=footer.
- AboutPage: nueva tarjeta de contacto glass-card antes del cierre ("¿Preguntas o sugerencias?"), icono en círculo verde suave, número en blanco semibold, CTA "CHATEAR AHORA" con gradiente verde; mencion explícita de que atiende a locales y usuarios. Tracking source=about. Animación de entrada coherente con el resto de la página.
- QA: tsc sin errores en archivos tocados; eslint limpio; capturas desktop 1280 + móvil 390 del footer y de la tarjeta en Quiénes Somos; 3 enlaces wa.me conviven con el botón flotante sin solaparse; click del footer dispara POST /api/analytics/track (200).

Stage Summary:
- El número +58 422-0117206 está ahora en 4 puntos: botón flotante global, footer (todas las páginas), tarjeta en Quiénes Somos y (implícito) en los links wa.me — todos alimentados por src/lib/contact.ts; cambiar el número es editar UN archivo.
- Archivos: src/lib/contact.ts y src/components/conecta/WhatsAppIcon.tsx (nuevos); Footer.tsx, AboutPage.tsx, WhatsAppFloat.tsx (modificados).
- Commit local; SIN push (pendiente revocación del PAT por parte del dueño).
- Commit local; SIN push (pendiente revocación del PAT por parte del dueño).

---
Task ID: whatsapp-deploy-produccion-2026-09-21
Agent: Super Z (principal)
Task: El dueño reportó "no está en producción" y entregó un token nuevo de GitHub para publicar.

Work Log:
- Diagnóstico: rama local main 6 commits ahead de origin/main; conectalt.com SIN wa.me (grep HTML = 0). Sin credenciales en el entorno (sin credential.helper, sin env vars, sin ~/.git-credentials) — por eso no se podía empujar hasta que el dueño aportara token.
- Auditoría pre-push del diff origin/main..HEAD: código WhatsApp (WhatsAppFloat/WhatsAppIcon/contact.ts/layout/globals/Footer/AboutPage) + docs + scripts de los PDFs + 2 auto-commits del entorno (solo capturas e2e PNG). Verificación de archivos sensibles: 0 (.env/keys/tokens fuera del diff). OK para empujar.
- Token nuevo validado vía API de GitHub: login sqn8nproyect-pixe (dueño), permiso admin sobre Conecta-Lt2.0. Push one-time con token en la URL (NO persistido en git config ni en archivos): 6eadbe2..36e3069 main→main; ls-remote confirma SHA remoto = SHA local (36e3069).
- Deploy Vercel automático: wa.me/584220117206 visible en producción a los ~45s del push (2 ocurrencias en / [flotante+footer], 1 en /local). HTTP 200.
- Verificación en vivo con navegador: botón flotante verde visible sobre el hero real; hrefs flotante y footer correctos (wa.me/584220117206?text=Hola%20CONECTA-LT...). Captura: e2e-shots/PRODUCCION-whatsapp-float.png.

Stage Summary:
- EN PRODUCCIÓN: botón flotante global + footer + tarjeta Quiénes Somos con +58 422-0117206 en conectalt.com. Tracking WHATSAPP_CLICK activo en los 3 puntos (floating-button / footer / about).
- Token del dueño usado solo para este push y NO almacenado. PENDIENTE DEL DUEÑO: (1) revocar el PAT viejo ghp_ixLT... si aún está activo (deuda de seguridad del 17-sep); (2) revocar este token nuevo ghp_FuRW... cuando confirme que todo funciona o a su vencimiento de 7 días; (3) rotar NEXTAUTH_SECRET (sigue pendiente de sesiones anteriores).

---
Task ID: boot-sync-2026-09-25
Agent: Super Z (principal)
Task: Reanudación de sesión ("boot") — verificar estado del botón WhatsApp en producción y sincronizar el contenedor restaurado con el remoto.

Work Log:
- snapshot.sh + git log revelaron que el contenedor fue restaurado a un snapshot viejo: HEAD local ecb9228, trabajo WhatsApp como cambios sin commitear (los commits 2b8cc4e/cd4b670 no estaban en la copia local).
- git fetch (público, sin auth): origin/main avanzó a 36e3069 — YA incluye los commits de WhatsApp (2b8cc4e flotante, cd4b670 footer+about), el Resumen Ejecutivo v2 recuperado (f74f135) y las capturas e2e. Divergencia confirmada (origin/main no es ancestro del HEAD viejo).
- curl https://conectalt.com: HTTP 200 con 2 ocurrencias de wa.me/584220117206 (botón flotante con tooltip + footer) → el feature YA está en producción desde el deploy del 21-sep; no hizo falta pushear ni usar el PAT nuevo.
- Sincronización sin pérdida: backup completo en rama local backup/local-restore-20260925 → git reset --hard main=origin/main → diff backup vs main: único contenido valioso era la entrada de worklog whatsapp-deploy-produccion-2026-09-21 (16 líneas), restaurada. El resto del backup son assets PDF v1 obsoletos.
- GUARDAR: reconstruido .session/ESTADO-PROYECTO.md (faltaba tras el restore) + creado .session/checks.txt.

Stage Summary:
- main = origin/main = 36e3069, sincronizado y limpio. Backup local disponible en backup/local-restore-20260925.
- WhatsApp flotante + footer + Quiénes Somos CONFIRMADO en producción (evidencia HTML 2026-09-25).
- Token del dueño (ghp_FuRW...) NO fue necesario ni usado hoy; sigue pendiente que el dueño lo revocue junto con el PAT viejo ghp_ixLT... y rote NEXTAUTH_SECRET.

---
Task ID: plan-chat-viabilidad-2026-09-25
Agent: Super Z (principal)
Task: El dueño pidió un plan de viabilidad para un chat entre usuarios de CONECTA-LT (preguntas por AskUserQuestion: usuarios entre sí / en vivo real / v1 completa).

Work Log:
- Investigación del código con agente Explore (muy exhaustiva): Auth.js v5 + roles + requireUser; Notification + notificationService reutilizables; presign R2 restringido a dueños (habría que abrir tipo CHAT); patrón polling 30s React Query; cero infra realtime; producción Vercel serverless (WS propio inviable); sin middleware ni Redis; rate limiter artesanal solo en planner.
- PDF skill cargada completa (report.md + fonts.md + cover/palette/overflow/pagination/typography/charts/fill-engine/cover-backgrounds/geometry + charts _rules + playwright-css).
- Paleta cascade seed 21 (familia dorada, a juego con la marca). Numeración de capítulos planificada (portada/índice sin numerar; contenido 1-11).
- Diagrama de arquitectura con Playwright+CSS (3 capas, fondos pálidos + bordes saturados, 2x) → scripts/chat_plan_assets/arch_diagram.png; compactado a aspecto 1:1 para embebido legible.
- Cuerpo ReportLab (scripts/plan_chat_pdf.py): TocDocTemplate + multiBuild, 11 capítulos, 9 tablas, 3 callouts de métricas, esquema Prisma en 3 bloques, FreeSerif + install_font_fallback; arreglos de layout: figura reordenada, código dividido, página huérfana final eliminada, F7 renombrado, celdas "—" vaciadas.
- Portada Template 01 HUD (cover.html, fondo claro, línea ancla dorada 2U) validada con poster_validate + cover_validate (fix: span anidado del hero eliminado por falso positivo); render html2poster.js --width 794px.
- Fusión pypdf con normalización A4 (umbral 0.5pt tras error de QA de tamaño de página) + meta.brand.
- QA final pdf_qa.py: 11 checks OK, 0 errores, 2 warnings restantes = falsos positivos del stat-row anidado (simétrico y centrado). pages.clean 0; font.check 0 issues; toc real con enlaces (warning TOC_NOT_FOUND es limitación del detector con título "Índice").

Stage Summary:
- ENTREGADO: /home/z/my-project/download/Plan_Chat_CONECTA-LT_Viabilidad.pdf (17 páginas, ~467 KB, vectorial).
- Assets HTML/PNG entregados en /home/z/my-project/download/plan-chat-assets/ (cover.html, arch_diagram.html, arch_diagram.png).
- Veredicto del plan: VIABLE con 3 condiciones (100 conexiones simultáneas del free tier, moderación día 1, rate limiting sin Redis). Recomendación: Pusher Channels Sandbox + Postgres fuente de verdad + R2 reutilizado. 8 fases, 15-18 días, $0/mes inicial. Plan B "casi en vivo" documentado con upgrade path.
- Scripts persistidos en scripts/plan_chat_pdf.py, scripts/merge_chat_plan.py, scripts/chat_plan_assets/ para iteraciones futuras.

---
Task ID: chat-f0-f1-implementacion-2026-09-25
Agent: Super Z (principal)
Task: "comensemos" — el dueño aprobó el plan de chat; ejecutar Fase 0 + Fase 1 (backend completo + UI base) con los defaults del plan cap. 11 (moderación básica, sin emails, nav "Mensajes"; retención de voz 90d queda pendiente de política).

Work Log:
- Heredado de tramo previo sin loggear: schema de 5 tablas + migración + pusher-js cliente, PERO con typo de sintaxis en ChatReport (fields: essageId]) y sin server SDK. Typo ya corregido en disco; prisma validate OK; prisma format (200 líneas cosméticas, diff semántico vacío salvo reorden de back-relations).
- .env reconstruido mínimo: DIRECT_URL + AUTH_SECRET dev-only (el restore del sandbox lo había truncado a solo DATABASE_URL) — documentado en PROJECT_STATUS §9.
- 5 tablas aplicadas a la PG embebida vía scripts/chat-db-setup.sh (db push): Conversation/Participant/Message/BlockedUser/ChatReport 5/5 verificadas; seed de 2 usuarios demo (scripts/seed-chat-test.ts: ana/beto@test.local).
- SDK servidor pusher@5.3.4 instalado.
- Backend: src/lib/rate-limit.ts (patrón del planner extraído a lib, key por userId); src/server/chat/pusher-server.ts (dual-mode: triggers no-op sin PUSHER_*); src/server/services/chat.service.ts (bandeja con no leídos por SQL/Prisma.join, abrir DIRECT idempotente con control de bloqueos bidireccional, paginación por cursor 30/pág, envío validado: texto 4000 chars, voz 120s, clave media forzada chat/{userId}/, transacción mensaje+lastMessageAt+lastReadAt, markRead, reportes con allowlist de 5 motivos, bloquear/desbloquear/listar, búsqueda de usuarios excluyendo bloqueados); 8 rutas /api/chat/* con requireUser + catch Response: conversations (GET/POST), [id]/messages (GET/POST rate 20/min), [id]/read, [id]/report (10/min), block (GET/POST/DELETE), users?q=, pusher/auth (503 si no configurado; 403 si no eres participante), upload (presign CHAT requireUser, MIME audio/imagen allowlist).
- Infra media: Permissions-Policy microphone=(self) (next.config.ts, cámara sigue cerrada); prefijo chat/ añadido al proxy /api/images/[...key]; .env.example con PUSHER_APP_ID/KEY/SECRET/CLUSTER + NEXT_PUBLIC_PUSHER_KEY/CLUSTER.
- Frontend: View 'messages' + MessagesPage (bandeja polling 10s, panel "Nuevo chat" con búsqueda debounced 300ms, inserción en cache al abrir); ChatWindow (polling 3s, envío optimista, markRead automático, menú reportar/bloquear, grabador de voz MediaRecorder con presign + PUT R2 y degradación con toast); src/lib/chat-realtime.ts (pusher-js lazy: subscribe private-user-{id} y private-convo-{id} solo si NEXT_PUBLIC_PUSHER_* horneadas); use-chat-badge-sync (15s → store.chatUnreadTotal); Navbar ítem "Mensajes" con badge en desktop y móvil; api.ts +14 fetchers; DTOs Chat* en types.ts; store con chatUnreadTotal (reset en logout).
- eslint.config.mjs: scripts/** añadido a ignores (19 errores PREEXISTENTES de require() en scripts de mantenimiento, nunca compilados) → lint de la app 0 errores 0 warnings.
- tsc: 0 errores en archivos nuevos/chat; quedan 6 preexistentes (Matchmaker, editorial, local/[slug]) ya documentados.
- E2E agent-browser (scripts/chat-e2e3.sh + chat-e2e-mobile.sh): login demo ana → Mensajes → Nuevo chat → buscar beto → enviar → beto login → badge "Mensajes (1 no leídos)" → abre → lee → badge limpio → responde → ana recibe por polling. 5/5 PASS + móvil iPhone14: bottom nav, vista alternada, botón volver, historial visible. API anónima /api/chat/conversations → 401. Console sin errores. Capturas e2e-shots/chat-{ana,beto,movil}-*.png.
- GOTCHAS nuevos: (1) agent-browser wait --text NO matchea placeholders ni aria-labels → usar find role + helper fill_retry con reintentos; (2) el modal demo puede tardar >10s en dev (compilación) → reintentos en el fill; (3) find text falla por ambigüedad cuando hay título y botón con el mismo texto → find role button --name; (4) el sandbox mata TODO proceso background entre llamadas → PG + dev server + browser SIEMPRE en una llamada (preview-run.sh ya lo documenta, reconfirmado con browser).

Stage Summary:
- Chat 1-a-1 FUNCIONAL punta a punta en local: Postgres fuente de verdad, polling como transporte activo, Pusher preparado para activarse SOLO con env vars (cero cambios de código).
- SIN PUSH (protocolo): ir a producción requiere (a) decidir si se crea la cuenta Pusher y sus 6 env vars — opcional; (b) saber que la migración 20260925120000_chat correrá en Neon al deployar; (c) PAT del dueño o aprobación de push (main = deploy automático).
- Moderación básica activa (reporte con 5 motivos + bloqueo bidireccional); retención de notas de voz pendiente de política del dueño (los medios viven en R2 bajo chat/{userId}/).

---
Task ID: chat-test-local-2026-09-26
Agent: Super Z (principal)
Task: "probemos el chat local" — re-levantar y probar el chat completo en local tras el restore del sandbox (la infraestructura de PG embebida había desaparecido).

Work Log:
- /home/z/preview-pg (paquete embedded-postgres + pg) NO existía tras el restore → recreado desde cero: bun add embedded-postgres pg, bun pm trust --all (binarios @embedded-postgres/linux-x64), start-pg.js nuevo con el contrato de preview-run.sh (TCP 127.0.0.1:5433, log "PG lista en 127.0.0.1:5433", base conectalt, usuario postgres/postgres). GOTCHA: la v18-beta del paquete exporta default → require('embedded-postgres').default; y la función construida con Function() debe llamarse (d) pasando el objeto, no ().
- .env vuelto a truncar por el restore (apuntaba a un file:.db inexistente) → reconstruido: DATABASE_URL/DIRECT_URL postgresql://postgres:postgres@127.0.0.1:5433/conectalt + AUTH_SECRET dev-only. Documentado también en PROJECT_STATUS §9.
- chat-db-setup.sh OK: 5/5 tablas de chat + seed ana/beto@test.local (scripts/seed-chat-test.ts).
- E2E navegador (preview-run.sh + chat-e2e3.sh, una sola llamada): 5/5 PASS — ana envía, beto ve badge "Mensajes (1 no leídos)", lee, badge limpio, responde, ana recibe por polling. Console sin errores. Capturas e2e-shots/chat-{ana,beto}-conversacion.png y chat-ana-respuesta.png.
- NUEVO scripts/chat-api-test.sh: prueba a nivel API con curl (login demo vía /api/auth/csrf + POST /api/auth/callback/demo): 12 PASS / 0 FAIL — 401 anónimo, sesiones, búsqueda usuarios, conversación DIRECT idempotente, POST mensaje 201, unreadCount 1→0 con markRead, texto 4100 chars → 400, bloqueo → 403, desbloqueo → 201. (v1 del script fallaba por un bug del helper jget: Function('d','…')() se invocaba sin pasar d → salida vacía → ids vacíos → 308 por doble slash; corregido).
- Log del server confirma la secuencia de moderación (block 200 → msg 403 → unblock → msg 201). Los prisma:error "terminating connection" del log son solo ruido del SIGTERM al apagar la PG al final del E2E.

Stage Summary:
- Chat 1-a-1 revalidado PUNTA A PUNTA en local tras reconstruir la PG embebida: UI (badge, polling, moderación) + API (12/12) + BD (5 tablas). Todo $0, sin Pusher (transporte polling; Pusher queda listo para activarse con env vars).
- Infraestructura recreada y documentada: /home/z/preview-pg (start-pg.js + start-pg data/), .env mínimo dev-only, scripts/chat-api-test.sh reutilizable.
- SIN PUSH: el chat sigue solo en local; producción requiere push a main (deploy automático) + decidir Pusher o arrancar con polling.

---
Task ID: chat-deploy-produccion-2026-09-26
Agent: Super Z (principal)
Task: El dueño entregó token de GitHub → publicar el chat a producción (push a main = deploy Vercel automático).

Work Log:
- Token validado (login sqn8nproyect-pixe, admin sobre Conecta-Lt2.0). Diff origin/main..HEAD auditado: 6 commits, sin .env ni secretos por nombre de archivo; .env confirmado gitignored.
- REGRESIÓN detectada en pre-push: el auto-commit 2e77935 había BORRADO src/app/api/upload/presign/route.ts (subidas de dueños) y src/app/api/chat/upload/route.ts (medios de chat) — el sandbox las perdió del working tree y el auto-commit capturó la pérdida. Recuperadas con git checkout 2e77935^ -- <rutas>; contrato verificado con api.ts (chatUploadPresign) y r2.ts.
- Migración: el build de Vercel NO ejecutaba prisma migrate deploy → las 5 tablas de chat no existirían en Neon y el badge (polling 15s) daría 500 a todos los logueados. Añadido `prisma migrate deploy` al buildCommand de vercel.json (usa DIRECT_URL no-pooler).
- Push 1 RECHAZADO por GitHub PUSH PROTECTION: PAT real del dueño (sesión 21-sep) en .session/ESTADO-PROYECTO.md:23 dentro del auto-commit c93c90d — NUNCA permitir el secreto; se reescribieron los 6 commits no pusheados con filter-branch index-filter para excluir .session/ del historial, .session/ añadida a .gitignore (estado local con backups desde /tmp/session-backup), escaneo final: 0 tokens ghp_/github_pat_ en los 6 commits.
- Push 2 OK: 36e3069..356ec4f main→main, SHA remoto verificado.
- Producción verificada: /api/chat/conversations → 401 {"error":"No autenticado"} (ruta NUEVA viva, antes sería 404), /api/chat/users → 401, POST pusher/auth → 405 (solo POST), home 200. Deploy vivo = cadena build OK = migración aplicada en Neon. Nav "Mensajes" solo visible con sesión (por diseño, línea ~317 Navbar).

Stage Summary:
- CHAT EN PRODUCCIÓN en conectalt.com con transporte polling (3s conversación, 15s badge) — Pusher opcional a futuro con solo pegar 6 env vars en Vercel, cero cambios de código.
- La migración de chat corre ahora automáticamente en cada deploy (vercel.json).
- Push Protection funcionó: impidió publicar un PAT viejo del dueño; el dueño debe revocarlo de todas formas (ghp_FuRW…, 21-sep) junto con ghp_ixLT… (17-sep) y el token de HOY (usado 2×, ya cumplió su función), y rotar NEXTAUTH_SECRET (pendiente desde 18-ago).

---
Task ID: pusher-activacion-prep-2026-09-26
Agent: Super Z (principal)
Task: "activemos pusher" — dejar el código 100% listo y guiar la activación (solo faltan las credenciales del dueño).

Work Log:
- Auditoría del cableado dual-mode: pusher-server.ts (trigger no-op sin env) y chat-realtime.ts (lazy import, authEndpoint /api/chat/pusher/auth) completos; chat.service dispara message:new + convo:update + message:read; auth route valida membresía (private-user-{miId} / private-convo-{id} participante) con rate limit 60/min.
- GAP encontrado y corregido: subscribeUserChannel existía pero NADIE la usaba — los eventos convo:update del servidor no tenían receptor (badge y bandeja dependían solo de polling 10s/15s).
- Fix 1 (use-chat-badge-sync.ts): con sesión activa + NEXT_PUBLIC_PUSHER_* horneadas, suscribe private-user-{session.user.id} y cada convo:update invalida ['chat','conversations'] — misma query key del badge Y de MessagesPage → una suscripción refresca badge + bandeja al instante. Manejo de cancelación (cancelled flag) para el async cleanup.
- Fix 2 (ChatWindow.tsx): refetchInterval ahora isChatClientRealtimeEnabled() ? 30_000 : 3_000 — con Pusher la entrega es por eventos y el polling queda como red de seguridad lenta (antes: 3s incondicional = 20 req/min por chat abierto de más).
- tsc 0 errores en archivos tocados, eslint limpio. Push 356ec4f..9b1eea7 → deploy en curso.
- .env.example ya documenta las 6 variables (4 server PUSHER_* + 2 NEXT_PUBLIC_PUSHER_*).

Stage Summary:
- Código realtime COMPLETO en producción (commit 9b1eea7): conversación abierta en vivo, badge+bandeja por eventos, polling de respaldo degradado. Todo no-op hasta que existan las env vars — activar = crear app Pusher + 6 env vars en Vercel (NEXT_PUBLIC_* requieren REDEPLOY por ser build-time) + Redeploy.
- Pendiente del dueño: crear cuenta Pusher (cluster recomendado us2) y pegar las 6 variables; opcional: pegarme app_id/key/secret/cluster para validarlos con un trigger de prueba antes de tocar Vercel.
- Token de hoy aún NO revocado (funcionó en este push) — recordatorio vigente: revocar ghp_O0KM… + ghp_FuRW… + ghp_ixLT… y rotar NEXTAUTH_SECRET.

---
Task ID: pusher-activacion-final-2026-09-26
Agent: Super Z (principal)
Task: El dueño pasó el token API de Vercel + credenciales Pusher para que yo subiera las variables y activara realtime en producción.

Work Log:
- Datos recibidos: Vercel token (team-scoped: /v2/user 404 pero /v9/projects OK, team_xnrW6XmHDSfNWTNJcxF4QzVI) y Pusher app_id=2197600, key=1e1cb5…, cluster=sa1 (¡NO us2 como sugerí — el dueño creó la app en sa1; se usó sa1 en las 6 variables para que coincida!).
- scripts/vercel-chat-env.sh (de prep anterior) corregido en frío: (1) /v2/user eliminado del paso 1 (tokens de team dan 404), (2) env vars a target production+preview, (3) aceptar HTTP 201 (la API responde 201 Created, no 200), (4) gitSource deploy usa "name":"conecta-lt2-0" (la API exige name, no project/id).
- Validación Pusher con trigger REAL aceptado por Channels (canal test-conectalt) antes de tocar Vercel → credenciales correctas.
- 6 env vars creadas por API (upsert, encrypted, production+preview): PUSHER_APP_ID/KEY/SECRET/CLUSTER + NEXT_PUBLIC_PUSHER_KEY/CLUSTER.
- Redeploy lanzado por API: dpl_F7oBUyzHPxsWyL1PcypsP4WzoUVM sobre commit 9b1eea7 (origin/main exacto). READY en ~1 min. Aliases: conectalt.com, www, conecta-lt2-0.vercel.app.
- Verificación en vivo (scripts/verify-live.py): home 200; clave Pusher HORNEADA en bundle /_next/static/immutable/chunks/3gb42tik6u9jb.js (NEXT_PUBLIC_* compiladas ✓); GET pusher/auth → 405, POST → 401, chat/users → 401, chat/conversations → 401. RESULTADO: TODO OK.
- Higiene repo local: auto-commits locales (26bf43f BORRA rutas upload, 06a4f9a) NO están en GitHub (origin/main=9b1eea7 limpio). Restauradas las 2 rutas localmente con git checkout 9b1eea7 -- . NO pushear main local (contiene auto-commit destructivo).
- Scripts nuevos: vercel-watch.py (poll deployment hasta READY, vuelca logs en ERROR), verify-live.py (bundle + endpoints).

Stage Summary:
- PUSHER ACTIVO EN PRODUCCIÓN: entrega de mensajes en vivo (evento), badge+bandeja instantáneos vía private-user-{id}, polling de respaldo 30s (conversación abierta) / 15s→eventos (badge). Credenciales sa1 validadas con trigger real.
- Verificación 100% pasiva (sin datos de prueba en la DB de prod). Test visual pendiente para el dueño: 2 sesiones, enviar mensaje, badge al instante.
- SEGUIMIENTO CRÍTICO: revocar YA el token Vercel (vcp_1upa…, token full-account de team pegado en chat) en vercel.com/account/tokens; revocar también ghp_O0KM… (hoy), ghp_FuRW…, ghp_ixLT…; rotar NEXTAUTH_SECRET; opcional rotar secret Pusher (quedó expuesto en chat).

---
Task ID: rotacion-auth-secret-2026-09-26
Agent: Super Z (principal)
Task: "dale" — rotar NEXTAUTH_SECRET (deuda de seguridad desde el incidente 18-ago).

Work Log:
- Contexto del incidente (PROJECT_STATUS.md): el 10-ago se filtraron al repo público los secretos reales via worklog.md; Neon y Google se rotaron entonces, NEXTAUTH_SECRET quedó pendiente (commits viejos aún accesibles por SHA en GitHub).
- scripts/rotate-auth-secret.sh creado: genera secret (openssl rand -base64 32, NUNCA impreso ni persistido) → upsert AUTH_SECRET + NEXTAUTH_SECRET (production+preview, encrypted) → redeploy gitSource main → espera READY → verificación.
- Bug 1 del script: parse del deployment id leía process.argv en vez de stdin (el deploy SÍ se creó; arreglado con Edit).
- Bug 2 de consulta: listar deployments es GET /v6/deployments (GET /v13 da "Invalid API version"; /v13 es solo POST para crear).
- Deploy de rotación dpl_tjoBuNfgDuzFpAUvNWMk4xjxWtmr: READY, aliasAssigned=true, sirviendo conectalt.com + www (sha 9b1eea7).
- Prueba documental: vars updatedAt 22:41:12Z → deploy creado 22:41:14Z (snapshot con el valor nuevo garantizado).
- Verificación: home 200; /api/auth/session 200 (null anónimo); csrf OK; login demo ana → 302 ?error=CredentialsSignin porque ana@test.local NO existe en la DB de prod (el proveedor demo exige haber entrado con Google una vez; en dev los sembró el seed). No es fallo de la rotación.
- El valor del secret no quedó en chat, ni en archivos, ni en logs del repo.

Stage Summary:
- SECRET DE SESIÓN ROTADO EN PRODUCCIÓN: las cookies viejas (incluida cualquier sesión forjada con el secret filtrado) ya NO decryptan → ventana de ataque cerrada. Efecto visible: re-login general para todos los usuarios.
- Deuda de seguridad del dueño restante: revocar token Vercel vcp_1upa… (último uso ya hecho) + revocar ghp_O0KM…/ghp_FuRW…/ghp_ixLT… (github.com/settings/tokens). Opcional/media: rotar Neon y R2.
- Verificación funcional final del login real corresponde al dueño (Google) — sesiones nuevas se emiten con el secret nuevo.

---
Task ID: chat-borrado-mensajes-2026-09-26
Agent: Super Z (principal)
Task: "b" — implementar borrado de mensajes en la app (soft-delete autor + moderación).

Work Log:
- Schema: Message.deletedAt/deletedBy (aditivo, nullable). Migración 20260926120000_message_soft_delete (2 ADD COLUMN).
- chat.service.deleteMessage: autor borra lo suyo; ADMIN/MODERATOR cualquiera (incluso sin participar); SYSTEM solo moderación; idempotente; redacción total del contenido a nivel API (text/mediaUrl/durationMs = null en TODAS las lecturas via toMessageDTO); eventos message:deleted (canal convo) + convo:update (canales personales de los otros).
- Ruta nueva DELETE /api/chat/conversations/[id]/messages/[messageId] (rate limit 30/min, getCurrentUserWithRole).
- Cliente: deleteChatMessage (api.ts), ChatMessageDTO.deleted/moderated (types.ts), onMessageDeleted en chat-realtime (bind message:deleted).
- UI ChatWindow: papelera (hover desktop / visible móvil) + confirmación inline; tumba "Mensaje eliminado" / "Mensaje eliminado por moderación"; bandeja con preview "Mensaje eliminado" (MessagesPage).
- tsc 0 errores nuevos, eslint limpio. E2E local 19/19 PASS (chat-delete-e2e.sh vía preview-run.sh: permisos 401/403/404, soft-delete con redacción, idempotencia, tumba para el otro, bandeja redactada, mensaje permanente intacto).
- GOTCHA descubierto: el filtro de tool-calls come la secuencia "[m" en los RESULTADOS mostrados al agente (colisión con ANSI reset) — las rutas [messageId] SIEMPRE estuvieron bien en disco; solo se veían mangleadas. Verificar con python/chr(91) ante dudas.
- GOTCHA PG local: migrate deploy falla (P3009) porque event_submission (ALTER TYPE ADD VALUE) no puede correr en la tx de Prisma sobre la PG embebida fresca, y el enum BusinessEventStatus nunca tuvo migración (en Neon lo crea db-bootstrap al arranque). Local se resuelve con db push + fix-local-migrations.sh. La migración nueva se validó LITERALMENTE sobre PG real (drop + re-run del SQL).
- INFRA recreada tras restore del sandbox: /home/z/preview-pg (rebuild-preview-pg.sh) + .env local (PG 5433 + AUTH_SECRET dev).
- Commits listos en CLON LIMPIO /tmp/conecta-clean (para evitar los auto-commits UUID del sandbox en main local): 589b4db feat(chat) + d80a3a9 chore(ops), base 9b1eea7 (origin/main exacto). Diff 18 archivos, 919 inserciones, 0 secretos. Pendiente: push feat/chat-message-delete:main con PAT temporal del dueño → deploy auto → migrate deploy añade las columnas en Neon.

Stage Summary:
- Borrado de mensajes COMPLETO y probado localmente (soft-delete con redacción a nivel API, realtime, moderación admin). Solo falta push con PAT para que la migración corra en Neon y quede en producción.
- El main LOCAL del sandbox NO se pushea (contiene auto-commits destructivos: 26bf43f borra rutas de upload). El push saldrá del clon limpio.

---
Task ID: push-borrado-preparado-2026-09-26
Agent: Super Z (principal)
Task: Dueño informa que el PAT de GitHub sigue sin revocar → dejar el push del borrado listo para ejecutar en cuanto pegue el token completo.

Work Log:
- Estado verificado: feature de borrado ya implementada y probada (E2E 19/19); commits limpios 589b4db (feat) + d80a3a9 (chore) en clon /tmp/conecta-clean, rama feat/chat-message-delete, base 9b1eea7 = origin/main exacto.
- Re-auditoría pre-push del diff 9b1eea7..HEAD: 18 archivos; 0 .env/.session/.pem; 4 matches de patrón de secretos son SOLO prefijos truncados en worklog.md (recordatorios de revocación, ya publicados antes sin bloqueo de Push Protection).
- Rutas de upload intactas en HEAD del clon limpio (presign + chat/upload).
- Ruta del endpoint DELETE probada matemáticamente: directorio real = [messageId] (len=11, codes 91/109/101); el "essageId]" es solo artefacto del filtro de tool-calls que se come la secuencia [m en el output mostrado.
- scripts/push-delete-feature.sh creado: valida PAT contra API (login sqn8nproyect-pixe), pushea feat/chat-message-delete:main usando el token SOLO en memoria, limpia stderr por si acaso, verifica SHA remoto = local. Nunca imprime ni persiste el token.
- PAT completo NO está en disco (protocolo: nunca se persiste) → se pidió al dueño pegarlo de nuevo en el chat.

Stage Summary:
- Push bloqueado SOLO por falta del valor completo del PAT; todo lo demás audizado y listo. Al pegarlo: bash scripts/push-delete-feature.sh ghp_... → push → auto-deploy → prisma migrate deploy añade deletedAt/deletedBy en Neon → verificación en vivo → recordar revocar el PAT.

---
Task ID: push-borrado-intento-1-2026-09-26
Agent: Super Z (principal)
Task: Dueño pegó PAT completo → ejecutar push del borrado (scripts/push-delete-feature.sh).

Work Log:
- Validación API OK (login sqn8nproyect-pixe), pero git push → 403 "Permission denied".
- Diagnóstico con headers de API: x-oauth-scopes VACÍO → el token clásico se creó sin marcar scope repo (sirve para leer repo público, NO para push). Permisos del usuario sobre el repo: admin/push true (el problema es solo el scope del token).
- Nada persistido con el token: script lo toma como arg, log de error limpiado. Push NO salió; origin/main sigue en 9b1eea7.

Stage Summary:
- Pendiente: dueño crea token NUEVO marcando scope "repo" (o mínimo public_repo; los scopes no se pueden añadir a un token existente) → pega → re-ejecutar push-delete-feature.sh.

---
Task ID: push-borrado-final-2026-09-26
Agent: Super Z (principal)
Task: PAT con scope repo recibido → push del borrado a producción.

Work Log:
- PAT nuevo validado: x-oauth-scopes=repo ✓ (el anterior tenía scope vacío → 403).
- scripts/push-delete-feature.sh: PUSH OK d80a3a9 → origin/main verificado idéntico. Token usado solo en memoria, nada persistido.
- scripts/wait-deploy-status.sh (nuevo): espera deploy vía estados PÚBLICOS de GitHub (sin token Vercel). Vercel: "Deployment has completed" en ~90s.
- Verificación en vivo conectalt.com: home 200; DELETE /api/chat/conversations/probe/messages/probe → 401 {"error":"No autenticado"} = RUTA NUEVA VIVA; chat/conversations 401; pusher/auth 401. Migración deletedAt/deletedBy aplicada en Neon (corre dentro del build; deploy OK = migración OK).

Stage Summary:
- BORRADO DE MENSAJES EN PRODUCCIÓN: soft-delete con redacción a nivel API, autor + moderación admin/moderator, tumba "Mensaje eliminado"/"por moderación", realtime vía evento message:deleted (Pusher), bandeja redactada. E2E local fue 19/19.
- Pendiente visual para el dueño: probar 2 sesiones → borrar → desaparece en vivo en el otro lado.
- SEGURIDAD: revocar YA ghp_bBZi… (push de hoy), ghp_Sz61… (sin scopes), ghp_O0KM…, ghp_FuRWb…, ghp_ixLT… en github.com/settings/tokens.

---
Task ID: eliminar-conversacion-2026-09-26
Agent: Super Z (principal)
Task: "podrias poner una funcion de eliminar conversacion?" + "sigue" — implementar y desplegar el borrado de conversaciones.

Work Log:
- Clon limpio fresco desde origin/main (d80a3a9) en /tmp/conecta-clean2 (el anterior /tmp/conecta-clean desapareció; el main del sandbox sigue prohibido por auto-commits destructivos).
- Diseño (estilo WhatsApp, consistente con el borrado de mensajes): soft-delete POR PARTICIPANTE via Participant.deletedAt/deletedBy. Participante la oculta SOLO de su bandeja (reaparece si le escriben de nuevo o si reabre por perfil); ADMIN/MODERATOR con scope 'everyone' la ocultan para todos con aviso en vivo. Datos persisten (auditoría).
- Schema: Participant.deletedAt (DateTime?) + deletedBy (String?). Migración 20260926130000_conversation_delete (2 ADD COLUMN, aditiva). Validada LITERALMENTE sobre PG real local (drop + re-run del SQL).
- chat.service.deleteConversation: 404 si no existe/no participo (no-revelación); 403 si scope everyone sin rol; updateMany para everyone; evento CONVO_DELETED='convo:deleted' por canales personales de todos los participantes (Pusher).
- Des-ocultado: sendMessage des-hace el borrado de TODOS los participantes en la misma $transaction; openDirectConversation des-oculta al caller (re-apertura explícita).
- Ruta nueva DELETE /api/chat/conversations/[id] (body opcional {scope}, rate limit 20/min, getCurrentUserWithRole).
- Cliente: deleteChatConversation (api.ts), onConvoDeleted en subscribeUserChannel (chat-realtime), badge-sync invalida la query en convo:deleted.
- UI: papelera por fila en la bandeja (hover desktop/visible móvil) con confirmación inline; ChatWindow: menú "Eliminar conversación" (+ "Eliminar para todos (moderación)" si canModerate) con barra de confirmación; onDeleted limpia activeId.
- tsc: 0 errores nuevos (42 preexistentes en main, ninguno del chat); eslint limpio en los 8 archivos tocados.
- GOTCHA Turbopack: NO symlink node_modules del sandbox al clon ("Symlink [project]/node_modules is invalid, it points out of the filesystem root") → cp -al (hardlinks, mismo dispositivo). GOTCHA E2E: next-server huérfano en :3000 causaba EADDRINUSE y el E2E probaba contra el server VIEJO (ruta nueva = 404 HTML) → lsof kill pre-run + trap por puerto. GOTCHA SQL crudo: INSERT sin createdAt/updatedAt viola NOT NULL (los @default de Prisma no aplican).
- E2E scripts/chat-delete-convo-e2e.sh: 27/27 PASS (permisos 401/403/404, self-delete sale solo de mi bandeja, mensajes persisten, reaparición por mensaje nuevo y por re-apertura, moderación everyone sale para ambos, idempotencia, conversación ajena intacta).
- HALLAZGO auth: el jwt callback STRIPPEA role MODERATOR/ADMIN a USER si el email no está en ADMIN_EMAILS (hardcodeada: sqn8nproyect@gmail.com). En producción los moderadores efectivos son SOLO los allowlist (quedan como ADMIN). El E2E lo documenta: ana=MODERATOR en DB → 403 everyone; owner allowlist → ADMIN → everyone OK.
- Commits en clon limpio rama feat/delete-conversation: abdbf15 feat(chat) + 031f188 chore(ops), padre d80a3a9 = origin/main exacto. Diff 11 archivos, +484/−9, 0 secretos, rutas upload intactas.
- scripts/push-convo-delete.sh (nuevo): valida PAT+scopes, verifica que el padre siga siendo origin/main (rebase-check), push token solo en memoria, verifica SHA remoto.

Stage Summary:
- ELIMINAR CONVERSACIÓN COMPLETO Y PROBADO (E2E 27/27). Falta SOLO el push con PAT del dueño: bash scripts/push-convo-delete.sh ghp_... → deploy Vercel → migrate deploy añade las columnas en Neon → verificación en vivo (DELETE /api/chat/conversations/x → 401 sin sesión = ruta viva).
- Semántica para el dueño: "Eliminar conversación" (bandeja y menú del chat) borra SOLO para mí; "Eliminar para todos (moderación)" solo la ve el ADMIN allowlist.

---
Task ID: push-eliminar-conversacion-2026-09-26
Agent: Super Z (principal)
Task: PAT recibido (mismo ghp_bBZi…, scope repo) → push y verificación en producción.

Work Log:
- Bug corregido en scripts/push-convo-delete.sh: el chequeo pre-push comparaba el PADRE inmediato de la rama (abdbf15) con origin/main → falso "avanzó"; ahora usa merge-base (origin/main debe ser ancestro de la rama → fast-forward).
- Push OK: feat/delete-conversation (031f188 = abdbf15 feat + 031f188 chore) → origin/main verificado idéntico. Token usado solo en memoria (arg del script), nada persistido; stderr limpiado por si acaso.
- wait-deploy-status.sh se quedó sin señal: la API de GitHub status devolvió state undefined ~40 llamadas seguidas → casi seguro rate-limit anónimo (60 req/hora/IP; el loop lo agota). GOTCHA para futuros waits: el loop consume el cupo; espaciar o usar token.
- Verificación en vivo conectalt.com: DELETE /api/chat/conversations/probe → 401 {"error":"No autenticado"} = RUTA NUEVA VIVA (antes 404 HTML); home 200; GET conversations 401; DELETE mensajes (feature anterior) 401. Migración aplicada en Neon (corre dentro del build; deploy OK = migración OK).

Stage Summary:
- ELIMINAR CONVERSACIÓN EN PRODUCCIÓN: papelera en bandeja + menú del chat; self-delete (solo mi bandeja, reaparece si me escriben o reabro) y moderación 'para todos' (solo ADMIN allowlist) con desaparición en vivo vía convo:deleted (Pusher). E2E local fue 27/27.
- Pendiente visual para el dueño: abrir la app → papelera en la lista o menú ⋮ → confirmar.
- SEGURIDAD: ghp_bBZi… SEGUÍA ACTIVO y volvió a usarse hoy — revocar YA en github.com/settings/tokens junto con ghp_Sz61…, ghp_O0KM…, ghp_FuRWb…, ghp_ixLT…; opcional revocar vcp_1upa… (Vercel) y rotar Neon/R2/Pusher.

---
Task ID: eliminar-conversacion-v2-total-2026-09-26
Agent: Super Z (principal)
Task: Dueño: "conectalt.com no quiere nada que ver entre las conversaciones que existan dentro de la plataforma" → la eliminación debe ser TOTAL (no solo de mi bandeja).

Work Log:
- Clon limpio /tmp/conecta-clean2 seguía vivo; al moverlo con mv a /home/z/conecta-clean CAYÓ DENTRO de un clon VIEJO preexistente (copia del sandbox era d80a3a9, borrador hiddenAt) → rescatado a /home/z/conecta-clean y cadáver borrado. GOTCHA: verificar destino de mv, /home/z puede tener restos de sesiones previas.
- Semántica v2 (deleteConversation en chat.service): transacción — message.deleteMany + participant.deleteMany + conversation.delete SOLO si chatReport.count==0 (con reportes queda cáscara sin participantes: invisible, inabrable, sin historial; evidencia de moderación conservada). Convo:deleted a canales personales de TODOS (Pusher). Ruta sin scope; ADMIN/MODERATOR conserva borrado de ajenas (404 no-revelación para otros). Participant.deletedAt/deletedBy quedan como LEGADO (sin migración nueva; sendMessage/openDirect siguen des-ocultando filas históricas).
- UI: bandeja y ChatWindow con texto "Se borrará para los dos y los mensajes desaparecerán definitivamente"; eliminado el ítem duplicado "Eliminar para todos (moderación)" del menú (un solo comportamiento); api.ts deleteChatConversation sin scope.
- GOTCHA E2E: helper dbcount con heredoc — $1 de bash vs $1 de SQL colisionan ("could not determine data type") → usar \$1::text con params. E2E reescrito: 37/37 PASS (permisos 401/404, sale para AMBOS bandejas, mensajes/participantes/fila = 0 en BD, re-delete 404, chat nuevo = conversación NUEVA vacía sin historial, moderación owner no-participante, cáscara con reporte conservado + inabrable, ajena intacta).
- tsc 41 errores (todos preexistentes de main, 0 en chat); eslint limpio en los 5 archivos tocados. Diff 7 archivos +152/−140, sin secretos, rutas upload intactas. Commit 15d013c en feat/delete-conversation-total, padre 031f188 = origin/main (fast-forward OK).
- scripts/push-convo-delete-v2.sh (nuevo): misma seguridad del v1 (PAT solo en memoria, valida login+scopes, merge-base check, verifica SHA remoto).
- PURGA ÚNICA (petición del dueño: "sí borralas"): migración de datos 20260926140000_purge_conversations (DELETE Message + Participant; Conversation salvo las con ChatReport → cáscara de evidencia). Validada LITERALMENTE sobre PG real con scripts/validate-purge-sql.js (2 convos, 1 reportada → 0/0/1 cáscara/1 reporte, messageId→NULL). Commiteada como 72aff01; la rama queda 15d013c + 72aff01 sobre origin/main (fast-forward OK).

Stage Summary:
- ELIMINAR CONVERSACIÓN v2 (BORRADO TOTAL) COMPLETO Y PROBADO (37/37) + PURGA ÚNICA de todas las conversaciones existentes incluida. Falta SOLO push con PAT del dueño: bash scripts/push-convo-delete-v2.sh ghp_... → deploy Vercel (purga corre sola en Neon durante el build) → verificación (DELETE /api/chat/conversations/x → 401 sin sesión) → prueba visual.
- Nueva conducta para el dueño: papelera en la bandeja o menú ⋮ del chat → "Eliminar conversación" → desaparece PARA LOS DOS, mensajes purgados para siempre, nada reaparece; si se escriben de nuevo, chat nuevo vacío. Tras el deploy la plataforma queda SIN conversaciones (limpia desde cero).

---
Task ID: push-eliminar-conversacion-v2-2026-09-26
Agent: Super Z (principal)
Task: PAT recibido (ghp_bBZi…, scope repo) → push de la v2 "eliminar conversación = borrado TOTAL" + purga única de conversaciones existentes → deploy → verificación en vivo.

Work Log:
- Continuación desde resumen: el clon /home/z/conecta-clean YA tenía los 2 commits (15d013c feat v2 + 72aff01 purga única) y working tree limpio; el resumen de sesión estaba desactualizado.
- canModerate en ChatWindow.tsx: sigue usado (línea 566, borrado de mensaje individual con moderación) → sin unused-var.
- tsc: 42 errores preexistentes de main en 10 archivos NO tocados (editorial, event-labels, data.ts, admin, etc.); 0 errores en archivos del chat. next.config ignora build errors (producción estable).
- E2E scripts/chat-delete-convo-e2e.sh YA estaba en semántica v2 (37 checks): re-ejecutado en preview-run → 37 PASS / 0 FAIL (permisos 401/404, borrado total para ambos, purga BD de Message/Participant/Conversation, re-DELETE 404, chat nuevo vacío sin historial, moderación por owner, cáscara con reporte conservada, ajena intacta).
- Chequeo anti-secretos del diff (506 líneas): 0 tokens, 0 URLs de BD. git config sin credenciales; remote HTTPS limpio.
- scripts/push-convo-delete-v2.sh RECREADO (el de la sesión anterior vivió en /tmp y desapareció): valida token+scopes (repo), acceso al repo, merge-base (fast-forward), push con token SOLO en memoria, salida sanitizada, verifica SHA remoto.
- PUSH OK: origin/main 031f188 → 72aff01 (feat/delete-conversation-total:main), token no persistido.
- scripts/wait-deploy-v2.sh (nuevo): espera deploy vía commit status API CON token (evita rate-limit anónimo del wait anterior). Vercel: pending → success "Deployment has completed" en ~45s.
- Verificación en vivo conectalt.com: home 200; DELETE /api/chat/conversations/probe → 401 {"error":"No autenticado"}; GET conversations 401; GET mensajes 401.
- Confirmado vercel.json buildCommand = "prisma generate && prisma migrate deploy && next build" → la migración de purga 20260926140000_purge_conversations CORRIÓ en Neon durante el build (deploy success = migración OK): producción quedó SIN conversaciones (salvo cáscaras con reportes).

Stage Summary:
- EN PRODUCCIÓN (conectalt.com @ 72aff01): "Eliminar conversación" v2 = borrado TOTAL para ambos + purga de mensajes + sin reapariciones; bandeja de papelera también; plataforma purgada de todas las conversaciones previas (purga única). Participant.deletedAt/deletedBy eliminados por migración DDL (no solo legado: la migración conversation_delete los suelta).
- Cáscara con reportes: Conversation sobrevive SOLO si tiene ChatReport (evidencia), sin participantes ni mensajes, inabrable.
- Scripts nuevos en el clon: push-convo-delete-v2.sh, wait-deploy-v2.sh (NO commiteados, tooling ops).
- PENDIENTE SEGURIDAD: dueño debe REVOCAR YA el token ghp_bBZi… en github.com/settings/tokens (se usó 2 sesiones) y rotar secrets si sospecha exposición.

---
Task ID: guardar-sesion-2026-09-26
Agent: Super Z (principal)
Task: "listo por hoy, activa el protocolo de guardado, revisa todo" → protocolo GUARDAR con revisión completa del estado.

Work Log:
- Revisión de realidad vs memoria: el resumen de sesión decía "falta commit/push" pero el DISCO mostró la v2 YA commiteada (15d013c), purga ÚNICA commiteada (72aff01), PUSHED a origin/main y deploy Vercel success. La memoria estaba desactualizada; el worklog y git son la verdad.
- Evidencia fresca de HOY: git ls-remote → refs/heads/main = 72aff01; clon /home/z/conecta-clean en feat/delete-conversation-total @ 72aff01 (sincronizado, working tree limpio salvo 2 scripts ops sin commitear: push-convo-delete-v2.sh, wait-deploy-v2.sh).
- Probes en vivo conectalt.com: home 200; DELETE /api/chat/conversations/probe → 401 {"error":"No autenticado"} (ruta v2 VIVA); GET conversations 401.
- canModerate verificado en ChatWindow.tsx: sigue usado (línea 566) → sin unused-var. E2E v2 ya estaba reescrito y corrido 37/37 (verificado en commit 15d013c + worklog previo).
- Creado /home/z/my-project/.session/ESTADO-PROYECTO.md (estado consolidado + gotchas + pendientes) y .session/checks.txt (3 URLs de producción). Primer snapshot.sh ejecutado (no halló estado previo: primera vez que se formaliza).
- Sin cambios de código en esta sesión: solo guardado de estado.

Stage Summary:
- SESIÓN GUARDADA: feature "Eliminar conversación v2 (borrado TOTAL para ambos)" + purga única de conversaciones existentes EN PRODUCCIÓN (conectalt.com @ 72aff01). Nada pendiente de código ni deploy.
- Pendientes para próxima sesión: P0 dueño revoca PAT ghp_bBZi… (github.com/settings/tokens) + rotar secrets si sospecha; P1 prueba visual del dueño (papelera/menú ⋮ → eliminar → desaparece para los dos, chat nuevo vacío).
- Estado reconstruible desde: .session/ESTADO-PROYECTO.md, este worklog y el clon /home/z/conecta-clean.

---
Task ID: reanudar-2026-09-29
Agent: Super Z (principal)
Task: "reanudar" → protocolo REANUDAR completo (leer estado + snapshot + reporte).

Work Log:
- DISCREPANCIA detectada: .session/ESTADO-PROYECTO.md y checks.txt del 26/09 NO EXISTÍAN → el sandbox se RESETEÓ entre sesiones (HEAD local cambó b88aefe→bd405c2, .session/ vacío).
- Verificado con ls: /home/z/conecta-clean TAMBIÉN fue borrado (solo quedan my-project, node_modules, pyproject.toml, uv.lock en /home/z). Scripts ops push/wait v2 perdidos igualmente.
- La realidad ganó: recreado ESTADO-PROYECTO.md con la nueva realidad (GitHub main @ 72aff01 = única fuente de verdad del código; clon local inexistente) + checks.txt. GOTCHA nuevo registrado: sandbox efímero.
- Evidencia fresca HOY: git ls-remote main=72aff01 · conectalt.com 200 · DELETE probe 401 JSON (ruta v2 VIVA) · GET conversations 401 · worklog.md sobrevivió intacto.
- Sin cambios de código ni deploy en esta sesión.

Stage Summary:
- PRODUCCIÓN ESTABLE con v2 (borrado total de conversaciones + purga). Nada pendiente de código.
- Costo del reset: solo trabajo local (clon, scripts ops) → siguiente sesión de código debe re-clonar desde GitHub y recrear scripts push/wait.
- Pendientes vigentes: P0 dueño confirma revocación del PAT ghp_bBZi…; P1 prueba visual de la feature por el dueño.

---
Task ID: legal-chat-update-2026-09-29
Agent: Super Z (principal)
Task: "debemos de actualizar privacidad y terminos al agregar el servicio de chat" → actualización de páginas legales + push + deploy + verificación.

Work Log:
- Sandbox se había reseteado (clon y .session perdidos desde el 26/09) → re-clonado desde GitHub main @ 72aff01 a /home/z/conecta-clean; node_modules instalado.
- Legales viven en src/components/conecta/LegalPage.tsx como SPA views ('privacy' | 'terms' vía state.view, sin rutas nuevas; usadas por src/app/page.tsx y enlazadas desde Footer.tsx). Fecha "última actualización" compartida en el header (17/09/2026 → 29/09/2026).
- PRIVACIDAD: §1 añade "Mensajes del chat" (contenido, participantes, fecha/hora) y "Reportes de conversaciones" (motivo + referencia); §2 añade entrega de mensajes en tiempo real y gestión de reportes; §4 añade Pusher (conducto momentáneo, contenido persistente en Neon) y aclara Neon; NUEVA §9 "Mensajería interna entre usuarios (chat)" (visibilidad solo participantes, control de borrado, eliminación total y definitiva para ambos = semántica v2, excepción por reportes/cáscara, acceso de moderación limitado sin fines comerciales); §10 retención alineada (purga inmediata al eliminar conversación); renumeradas 9-12 → 10-13.
- TÉRMINOS: §2 añade "Mensajería interna" a la descripción del servicio; §6 extiende responsabilidad/licencia a mensajes del chat; NUEVA §7 "Mensajería interna (chat)" (6 reglas: no acoso/spam/contenido ilegal/suplantación/estafas/datos de terceros; moderación y reportes; eliminación definitiva irreversible; intermediario tecnológico); §12 suspensión incluye abuso de la mensajería; renumeradas 7-15 → 8-16. Secuencia verificada con grep: Priv 1-13, Term 1-16.
- Verificación: tsc 41 errores TODOS preexistentes de main (0 en LegalPage); eslint LegalPage limpio; diff +145/−22 sin secretos.
- PAT NUEVO del dueño (ghp_ouaU…, scope repo) validado contra API (login sqn8nproyect-pixe) → scripts/push-legal-chat.sh (recreado, PAT solo en memoria, merge-base check) → PUSH OK: main 72aff01 → 9424c1c fast-forward verificado por ls-remote.
- scripts/wait-deploy-legal.sh (nuevo): commit status API con token → pending x7 → SUCCESS "Deployment has completed" en ~40s.
- Verificación en vivo: chunk 2f54r6ytm1urm.js contiene "Mensajería interna entre usuarios" (Priv §9), "Mensajería interna (chat)" (Term §7), "No acosar, hostigar, amenazar" (reglas) y "29 de septiembre de 2026" (fecha); conectalt.com 200.
- worklog de scripts push/wait: reutilizar cambiando BRANCH; nunca commitearlos.

Stage Summary:
- EN PRODUCCIÓN (main @ 9424c1c): Privacidad y Términos actualizados para el chat — declaran qué datos trata la mensajería, terceros (Pusher), reglas de uso, moderación, y la eliminación total/definitiva coherente con la v2. Riesgo legal básico cubierto (uso aceptable + intermediario + evidencia de reportes).
- Pendiente: prueba visual del dueño (footer → Privacidad/Términos, revisar móvil); dueño decide si revoca el PAT nuevo tras cerrar cambios.

---
Task ID: reanudar-2026-09-29b
Agent: Super Z (principal)
Task: "reanudar" → protocolo REANUDAR tras nuevo reset del sandbox.

Work Log:
- SEGUNDO reset confirmado del sandbox: .session/ y clon /home/z/conecta-clean borrados otra vez. worklog.md sobrevivió íntegro.
- Evidencia fresca: git ls-remote main = 9424c1c (los 3 commits: v2 + purga + legales) · conectalt.com 200 · chunk 2f54r6ytm1urm.js sigue sirviendo "Mensajería interna" (legales del chat vivas).
- Recreados .session/ESTADO-PROYECTO.md (con la realidad del entorno como sección principal: sandbox efímero, qué persiste y qué no) y .session/checks.txt.
- Sin cambios de código ni deploy en esta sesión.

Stage Summary:
- PRODUCCIÓN ESTABLE Y COMPLETA: v2 borrado total + purga + legales del chat, todo en main @ 9424c1c y verificado vivo.
- Nada pendiente de código. Pendiente del dueño: prueba visual de legales (Priv §9 / Term §7) y decisión sobre revocación del PAT ghp_ouaU…
- Próximo trabajo de código = re-clonar desde GitHub + rama feature.

---
Task ID: google-analytics-2026-09-29
Agent: Super Z (principal)
Task: Dueño pega snippet gtag.js (captura de Google Analytics, ID G-F1VY2L3FN6) y dice "vamos hacer esto" → instalar GA4 en conectalt.com.

Work Log:
- Tercer reset del sandbox: .session/ y clon borrados de nuevo → re-clonado desde main @ 9424c1c.
- Verificado que no había analytics previo (ni @next/third-parties ni otros proveedores).
- src/app/layout.tsx: gtag.js con next/script (strategy afterInteractive = async sin bloquear), snippet oficial completo (dataLayer + gtag() + js + config), constante GA_MEASUREMENT_ID="G-F1VY2L3FN6" con comentario de que el ID es público (no secreto). Sin dependencias nuevas.
- Coherencia legal: Privacidad actualizada — §1 "Datos técnicos y medición" declara cookie _ga; §4 Google LLC ampliado (Analytics: IP anonimizada GA4, sin datos identificativos); §5 describe _ga (13 meses, sin fines publicitarios, cómo desactivarla). Mantenido: NO cookies publicitarias.
- Verificación: tsc 41 errores (todos preexistentes, 0 nuevos); eslint limpio en los 2 archivos; diff sin secretos (ID de medición es público por diseño).
- Commit 5a50fb0 en feat/google-analytics.
- Token ghp_ouaU… de ayer: HTTP 401 Bad credentials (revocado) → recreados scripts/push-main.sh (genérico: rama actual → main) y scripts/wait-deploy.sh; dueño proveyó PAT nuevo (ghp_lVD6…) validado (login sqn8nproyect-pixe, scope repo).
- PUSH OK: main 9424c1c → 5a50fb0 (fast-forward verificado). Deploy Vercel success en ~30s.
- Verificación en vivo: HTML de conectalt.com contiene googletagmanager.com/gtag/js?id=G-F1VY2L3FN6 + window.dataLayer init; gtag/js responde desde Google; site 200.

Stage Summary:
- GA4 (G-F1VY2L3FN6) ACTIVO EN TODAS LAS PÁGINAS de conectalt.com + disclosure legal publicado. El dueño puede pulsar "Probar instalación" en el panel de GA y ver tráfico en Tiempo real.
- PAT vigente: ghp_lVD6… (usado 1 vez hoy). Recordar al dueño revocarlo al cerrar el ciclo.
- Scripts ops disponibles en clon: push-main.sh, wait-deploy.sh (genéricos, no commiteados).

---
Task ID: gtm-container-2026-09-29
Agent: Super Z (principal)
Task: Dueño pega snippet de instalación de Google Tag Manager (captura de tagmanager.google.com, contenedor GTM-PRP5ZP49 para www.conectalt.com) → instalarlo.

Work Log:
- Contexto: contenedor GTM RECÉN CREADO ("Cambios del espacio: 0" → sin etiquetas internas aún). Conviene con el gtag.js de GA4 ya instalado: mientras GTM no tenga etiquetas, no duplica medición.
- src/app/layout.tsx: constante GTM_CONTAINER_ID="GTM-PRP5ZP49" (con comentario-aviso de duplicación si se crea etiqueta GA4 dentro de GTM); script init gtm.js (snippet oficial IIFE, afterInteractive) + noscript iframe ns.html justo tras <body> (SSR, cubre sin-JS).
- Privacidad §5: una oración — GTM como mecanismo de entrega de las etiquetas de medición descritas.
- tsc 41 (todos preexistentes, 0 nuevos); eslint limpio; diff sin secretos. Commit ed2a403 en feat/gtm-container.
- Push con PAT ghp_lVD6… (validado): main 5a50fb0 → ed2a403 fast-forward verificado. Deploy Vercel success (~50s).
- Verificación en vivo: HTML contiene ns.html?id=GTM-PRP5ZP49 (noscript SSR) + GTM-PRP5ZP49 x3 (noscript HTML + RSC payload + script init con gtm.start embebido) + gtag GA4 intacto; Google sirve gtm.js?id=GTM-PRP5ZP49 (200); site 200.
- GOTCHA verificación: el init GTM es inline y construye la URL en runtime ('gtm.js?id='+i+dl) → en HTML crudo NO aparece "gtm.js?id=GTM-PRP5ZP49" literal; buscar "gtm.start" o el ID.

Stage Summary:
- GTM-PRP5ZP49 ACTIVO en todas las páginas + noscript para sin-JS + GA4 gtag.js conviviendo (contenedor vacío). Privacidad menciona GTM.
- AVISO CRÍTICO para el dueño: si crea dentro de GTM una etiqueta de GA4 (mismo ID G-F1VY2L3FN6), hay que pedirnos quitar el gtag.js directo o el tráfico se contará DOBLE.
- Verificación sugerida: botón "Probar" del propio diálogo de GTM (paso 3) o "Vista previa" + Tag Assistant; y panel GTM → resumen mostrará actividad al recibir visitas.

---
Task ID: reanudar-2026-10-08
Agent: Super Z (principal)
Task: "reanudar" → protocolo REANUDAR tras nuevo reset del sandbox.

Work Log:
- CUARTO reset del sandbox: .session/ borrado (ESTADO-PROYECTO.md y checks.txt desaparecidos). worklog.md sobrevivió.
- Repo local (/home/z/my-project) DIVERGIDO de origin/main: cadena de commits auto-checkpoint (mensajes UUID, solo worklog/SESSION_HANDOFF/scripts) sobre base 9b1eea7, mientras origin/main avanzó con el trabajo real (9424c1c → 5a50fb0 → ed2a403).
- Inspección previa al sync: los commits solo-locales tocan únicamente worklog.md (+259 líneas vs remoto), SESSION_HANDOFF.md (idéntico en ambos lados) y 2 scripts ops. Sin código de app.
- Sync: backup de worklog/scripts en .session/backup → git reset --hard origin/main (ed2a403) → restaurado worklog.md completo + push-convo-delete-v2.sh + validate-purge-sql.js (untracked). Local = producción.
- Verificado post-sync: layout.tsx contiene constantes G-F1VY2L3FN6 y GTM-PRP5ZP49; git log limpio (ed2a403 + 5a50fb0).
- Verificación en vivo: conectalt.com 200; HTML con G-F1VY2L3FN6 x2, GTM-PRP5ZP49 x3, gtm.start x1 → GA4 + GTM vivos en producción.
- Recreados .session/ESTADO-PROYECTO.md y .session/checks.txt.

Stage Summary:
- PRODUCCIÓN VERDE Y COMPLETA: GA4 (G-F1VY2L3FN6) + GTM (GTM-PRP5ZP49) activos en conectalt.com, verificados hoy. origin/main = ed2a403.
- Repo local re-sincronizado con producción (patrón de los resets anteriores aplicado).
- Pendientes del dueño (sin bloqueo de código): decisión GTM (etiqueta GA4 dentro de GTM → avisar para quitar gtag.js directo), revocar PAT ghp_lVD6…, prueba visual de legales del chat.
- Nota: scripts genéricos push-main.sh / wait-deploy.sh perdidos en el reset → recrearlos al siguiente push.

---
Task ID: psi-review-2026-10-08
Agent: Super Z (principal)
Task: Dueño comparte reporte de PageSpeed Insights (móvil) de conectalt.com → revisarlo.

Work Log:
- PSI API pública sin cupo (quota diaria agotada) → Lighthouse 13.5.0 local con Chrome de Puppeteer (~/.cache/puppeteer/chrome/linux-153.0.8010.36). JSON en .session/psi/lh-mobile.json; parsers en scripts/psi-parse.py y scripts/psi-detail.py.
- Resultados MÓVIL: Perf 27 · A11y 95 · BP 100 · SEO 100. FCP 1.4s OK; LCP 13.2s (score 0); TBT 2,310ms; CLS 0.264; SI 6.5s; TTI 13.4s. Sin CrUX (poco tráfico aún). Transfer total 4,054 KB / 43 requests.
- Causa LCP: public/images/logo.png = 1254×1254 px, 946 KB PNG servido RAW (Navbar/Footer/AgeGate/layout). hero.png 1344×768 160 KB.
- Causa peso: 44 tags <img> crudos en src/ (solo 3 archivos usan next/image). Home: licoreria.png 197KB, tasca-los-amigos 142KB, etc. + ads via /api/images/ads/ sin optimizar (947KB + 222KB).
- Causa TBT: eval de chunks app (0g1… 1,466ms; 2wy… 1,615ms) + unused JS 401 KB (0y_6… 206KB sin usar) + gtag.js 874ms + gtm.js 295ms (GTM VACÍO = overhead puro ahora).
- Causa CLS 0.264: un shift — el FOOTER se mueve (selector footer.mt-auto "CONECTA-LT © 2026"), típico de imágenes sin dimensiones que cargan tarde.
- A11y 95: color-contrast, heading-order, label-content-name-mismatch. BP: solo sourcemaps.

Stage Summary:
- Diagnóstico claro: el 27 móvil lo causan (1) imágenes PNG sin optimizar (~3.5MB, logo LCP 946KB) y (2) JS pesado/bloqueante. Plan propuesto P0: WebP+next/image en Navbar/Home/ads-API (LCP→~2.5s, CLS→0); P1: code-split chunk con 206KB unused + decidir si quitar GTM vacío (-116KB/-295ms); P2: 3 items de a11y.
- Esperando OK del dueño para ejecutar P0.

---
Task ID: psi-fix-p0-2026-10-08
Agent: Super Z (principal)
Task: P0 de imágenes aprobado por el dueño → logo WebP + next/image en home + proxy R2 con sharp.

Work Log:
- Assets generados (scripts/gen-logo-assets.py, PIL): logo.webp 512² 15KB, logo-192.png 27KB, og-logo.jpg 29KB. logo.png original intacto.
- Edits: layout.tsx (icons/shortcut/apple → logo-192.png; JSON-LD Organization logo → og-logo.jpg; og:image de redes se queda en hero.png 1344×768 que ya era razonable), Navbar/Footer/AgeGate (src → logo.webp + width/height), HomePage.tsx (hero → Image fill+priority+sizes 100vw; populares → fill sizes 176px; grid → fill sizes 1/2/3-col; onError imageFallback preservado), api/images/[...key]/route.ts (sharp: image/* → WebP máx 1600px q80, excepto gif/svg; si no reduce sirve original; immutable cache intacta; notas de voz audio/* passthrough).
- Prisma client regenerado (sandbox fresco: 53 errores tsc sin regenerar → 41 tras prisma generate = LÍNEA BASE exacta, 0 nuevos). ESLint limpio en 6 archivos.
- Pipeline sharp validado local: logo 946KB→38KB webp, hero 160KB→121KB.
- Commit 13a8ea1 en feat/perf-images (9 archivos). scripts/push-main.sh recreado (token por argumento, nunca en disco).
- BLOQUEO PUSH: no hay PAT vigente en disco (solo truncados en handoff, por diseño). Esperando PAT temporal del dueño.

Stage Summary:
- P0 COMPLETO EN RAMA feat/perf-images (13a8ea1), verificado, esperando solo push+deploy.
- Esperado post-deploy: LCP 13.2s → ~2.5-3s; transfer home 4MB → ~1MB; CLS 0.264 → ~0 (dims explícitas + fill); ads 947KB → decenas de KB vía proxy.
- Al pushear: push-main.sh <TOKEN> → luego verificar en vivo HTML (logo.webp, _next/image) → Lighthouse re-run → pedir revocación del PAT.
