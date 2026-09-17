> ℹ️ El historial antiguo está en `worklog-archivo-2026-09.md`
> (último re-archivado: 2026-09-17 — 17 entradas movidas).
> Leer la COLA de ese archivo para contexto antiguo; la COLA de worklog.md para lo reciente.

---
Task ID: escaparate-variantes-anuncios
Agent: Super Z (main agent)
Task: El dueño rechazó el fondo difuminado desplegado ("se ve horrible y rompe toda la estética"). Pidió 3 sugerencias con capturas que sigan la estética del sitio, SIN subir nada al repo, para escoger.

Work Log:
- REPO INTACTO: ningún commit nuevo de código, nada pushado. El componente se restaura con git checkout al terminar el preview (trap). Único commit local = docs de este registro.
- Artes realistas nuevos (scripts/gen-test-ads.py, gitignoreado): logo sobre blanco 1024², flyer rojo 1024², flyer vertical neón 600×900 — imitan los anuncios reales del dueño.
- Un solo componente con 3 variantes (scripts/ad-variants/AdCarousel.variant.tsx, gitignoreado; marcador @@VARIANT@@): A "Vitrina" (object-contain sobre fondo oscuro sólido #0d0d17), B "Color del arte" (canvas 8×8 muestrea bordes → color clamp nocturno canal máx 56 + gradiente negro lateral), C "Anuncio nativo" (split 44%/56%: arte + panel con PUBLICIDAD, título line-clamp-2 y botón dorado VER MÁS). Todas con arte completo (sin recorte, requisito original intacto).
- Runner scripts/preview-variants.sh: ?noautoplay=1 congela el carrusel (NOAUTOPLAY en el componente); avance por [data-slot="carousel-next"] (los botones NO tienen aria-label — lección: "Next slide" es un span sr-only interno); lámina visible verificada por src de la imagen centrada. 12 capturas + comparativa.
- Entregable: download/sugerencias-anuncios/00-COMPARATIVA.png (+ A-vitrina/, B-color-arte/, C-anuncio-nativo/ × 4 capturas c/u).
- PRODUCCIÓN SIGUE CON EL FONDO DIFUMINADO (e184306) hasta que el dueño escoja. Recordar: revocar PAT #3.

Stage Summary:
- Escaparate completo local sin tocar el repo. Decisión pendiente del dueño: A, B o C → tras elegir, implemento la variante limpia (carrusel + vistas previas admin coherentes), commit, push y verificación.

---
Task ID: sprint-8.14
Agent: Super Z (principal)
Task: Carrusel MULTITARJETA de publicidad — petición explícita del dueño tras rechazar el fondo difuminado y las 3 variantes propuestas. "Mantener las proporciones exactas de la imagen original y mostrar varios bloques uno al lado del otro, con las flechas a los lados". SOLO LOCAL, sin push.

Work Log:
- Reescrito AdCarousel.tsx (Sprint 8.14): CarouselItem pasa de basis-full a basis-auto; cada tarjeta envuelve la imagen con altura fija (h-150/190/230) y ancho natural (w-auto) → proporción original exacta, sin capa de fondo difuminado. Estética del sitio: rounded-xl, border-white/15, bg-white/5, hover:border-white/30, badge PUBLICIDAD compacto (9px). opts embla: align:'start', loop cuando >1 anuncio. Flechas prev/next intactas (a los lados) y drag táctil de embla.
- AdsTab.tsx (admin): quitadas las 2 capas blur (preview del formulario y miniatura de fila); vista previa centrada con proporción original; hint actualizado: "Ideal cuadrada 1080×1080 o horizontal 1200×400 · se muestra completa, en su proporción original".
- Nuevo scripts/preview-mc-data.ts: 6 anuncios demo (3 realistas arte-blanco/rojo/noche + 3 de marco en proporciones extremas 1024²/1200×400/600×900). gitignoreado vía /scripts/preview-*.
- Nuevo scripts/preview-ads-solo.ts (modelo Prisma correcto: db.advertisement): desactiva sortOrder>0 para capturar el caso de un solo anuncio.
- Nuevo scripts/preview-multicard.sh v3 (E2E): pausa del autoplay con 'mouseover' despachado por polling en cuanto el carrusel existe (mouseenter NO delega en React — el intento previo no pausaba); botones Next/Prev localizados por sr-only "Next slide" (no tienen aria-label); verificaciones: anchos de items [248,248,171,248,708,171] = imagen+padding/borde (proporciones exactas), sin clases blur, transform de pista se desplaza -248px con la flecha, autoplay pausado, anuncio único → 1 tarjeta.
- Capturas en download/carrusel-multitarjeta/: 01 escritorio fila en posición 0, 02 tras flecha, 03 móvil 390×844, 04 móvil tras flecha, 05 anuncio único.
- Sin commit y sin push: cambios en src/ quedan como modificaciones locales sin stagear; main sigue en ba479f9 sincronizada con origin.

Stage Summary:
- Carrusel multitarjeta implementado y verificado localmente (desktop+móvil, 6 anuncios y 1 solo). Pendiente: aprobación del dueño → aplicar commit → push con PAT NUEVO (PAT #3 marcado para revocar). Si el dueño lo rechaza, git checkout de los 2 archivos restaura el estado desplegado.

---
Task ID: sprint-8.14-deploy
Agent: Super Z (principal)
Task: Despliegue del carrusel multitarjeta a producción (dueño aprobó reenviando el PAT #3).

Work Log:
- Push de 3 commits pendientes (aac99e2..31def81): multitarjeta (componentes+capturas+worklog) y docs de variantes A/B/C. PAT #3 (el mismo, no revocado) usado una vez más; remote restaurado limpio inmediatamente tras el push.
- Verificación en producción SIN API GitHub: scripts/verify-deploy-multicard.sh descarga los chunks JS servidos por conectalt.com y grep basado en clases/textos. Confirmado al intento 1 (2 min tras push): chunk a65c87fc739e3bc5.js contiene basis-auto Y el hint "proporción original"; blur-2xl AUSENTE en todos los chunks.
- SESSION_HANDOFF.md actualizado a Sprint 8.14.

Stage Summary:
- Multitarjeta LIVE en conectalt.com. Pendiente: dueño REVOCAR PAT #3 (ya se usó en 2 sesiones de push); rotar NEXTAUTH_SECRET; validar el carrusel con sus 3 anuncios reales.

---
Task ID: fix-boton-eliminar-movil
Agent: Super Z (principal)
Task: Botón ✕ de eliminar imagen solo aparecía al hover (invisible en teléfono). El dueño de un local (ej. licobarjj) no ve cómo borrar su carta subida como imagen. Petición: "hazlo".

Work Log:
- Investigación: el dueño del local SÍ puede eliminar sus imágenes MENU sin admin (DELETE /api/owner/businesses/[slug]/images?imageId= borra de R2 y DB; moderación solo para aprobación). Hallazgo: botón con opacity-0 group-hover:opacity-100 → invisible en táctil (3 lugares: MenuTab "Carta en archivos", OwnerDashboard galería/portada, image-upload-zone compartido).
- Fix en 3 archivos: opacity-100 por defecto + pointer-fine:opacity-0 / pointer-fine:group-hover:opacity-100 / pointer-fine:focus-visible:opacity-100 (Tailwind 4.1). Móvil (pointer:coarse): siempre visible; PC: igual que antes.
- Verificado: eslint 0 errores; CSS compilado en dev contiene @media (pointer: fine) (9 usos).
- Commit d334660 local. PUSH FALLÓ: PAT #3 REVOCADO por el dueño (correcto, "could not read Password"). Pendiente: push con PAT nuevo.

Stage Summary:
- Fix listo y verificado localmente; falta push con PAT nuevo que pedirá el dueño. Responder al dueño: instrucciones para generar token (Settings → Developer settings → Tokens classic, scope repo).

---
Task ID: fix-boton-eliminar-movil-deploy
Agent: Super Z (principal)
Task: Despliegue del fix del botón eliminar en móvil (PAT #4).

Work Log:
- PAT #3 reenviado por el dueño → push FALLÓ de nuevo (revocado, como se le pidió). Se le explicó paso a paso cómo generar uno nuevo.
- PAT #4 (ghp_cou...aUBo) recibido → push OK 31def81..79cb3c1 (3 commits: fix d334660 + auto-commits del entorno). Remote restaurado limpio.
- Verificación en producción: chunk JS contiene pointer-fine:opacity-0 (clases del fix) → confirmado al intento 3 (~2 min tras push).

Stage Summary:
- Fix del botón ✕ EN PRODUCCIÓN: visible siempre en móvil (pointer:coarse), hover en PC, en carta (MenuTab), galería/portada (OwnerDashboard) y zona de subida (image-upload-zone). Los dueños de locales pueden borrar sus fotos de carta solos. Pendiente: dueño revoca PAT #4 al final de los cambios; seguir recordando rotación de NEXTAUTH_SECRET.

---
Task ID: 8.14-fix-push
Agent: Super Z (principal)
Task: Push del commit d334660 (botón eliminar visible en móvil) con PAT nuevo + verificación en producción

Work Log:
- Push exitoso con PAT nuevo: 79cb3c1..a3d8df1 main -> main (incluye d334660 "fix(owner): botón eliminar siempre visible en móvil")
- Remote restaurado a URL limpia inmediatamente después del push
- Verificación por CSS compilado de producción (los chunks de MenuTab solo cargan con sesión de dueño, así que se verifica vía CSS global):
  - https://conectalt.com/_next/static/chunks/9e6e99b1aa6d9e31.css contiene:
  - @media (pointer:fine){.pointer-fine\:opacity-0{opacity:0} → en PC oculto por defecto
  - @media (hover:hover){.pointer-fine\:group-hover\:opacity-100...} → en PC aparece al hover
  - .pointer-fine\:focus-visible\:opacity-100:focus-visible → accesible por teclado en PC
  - En móvil (pointer:coarse) ninguna aplica → base opacity-100 → ✕ SIEMPRE visible ✓
- Extra: contestada pregunta del dueño — sitemap.ts es DINÁMICO (verificado en vivo: conectalt.com/sitemap.xml sirve 37 URLs = 3 estáticas + 33 locales ACTIVE + 1 editorial PUBLISHED, lastmod real por updatedAt, ISR 1h, fallback estático si DB falla)

Stage Summary:
- Fix botón ✕ en móvil LIVE en producción (commit d334660)
- Los dueños de locales (ej. licobarjj) ya pueden borrar su carta/galería desde el teléfono
- Sitemap dinámico confirmado funcionando con datos reales de DB
- Recordatorio pendiente para el dueño: revocar este PAT cuando confirmemos; rotar NEXTAUTH_SECRET + Redeploy; datos de anunciantes (IG Africa Burguers, IG Licobar JJ, dirección Medusa)

---
Task ID: 8.15-geo
Agent: Super Z (principal)
Task: GEO — visibilidad de conectalt.com en IAs (ChatGPT, Claude, Perplexity, Gemini)

Work Log:
- robots.ts: regla EXPLÍCITA para 17 rastreadores de IA (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot/User/SearchBot, PerplexityBot/User, Google-Extended, Applebot-Extended, meta-externalagent, Amazonbot, CCBot, Bytespider, YouBot, Diffbot, ImagesiftBot) — allow público, disallow /api/ y /r/
- src/app/llms.txt/route.ts NUEVO: llms.txt dinámico (estándar llmstxt.org) — H1 + descripción + locales ACTIVE agrupados por categoría (nombre, zona, dirección, precio, especialidad) + posts PUBLISHED + sección "Cómo citar". ISR 1h, fallback estático si DB falla, Content-Type text/markdown
- layout.tsx: JSON-LD global @graph WebSite (@id #website, inLanguage es-VE) + Organization (@id #organization, logo) — nivel superior del LocalBusiness que ya emiten las fichas
- Lint OK (errores tsc restantes: 27 preexistentes en archivos no tocados)
- Commit b58637b, push con PAT, remote limpio
- Verificado en producción al primer intento: robots.txt con los 17 bots, /llms.txt 200 con contenido real de DB (33 locales), JSON-LD en el home

Stage Summary:
- conectalt.com ya es legible y citable por ChatGPT, Claude, Perplexity, Gemini, Copilot, Meta AI y Apple Intelligence
- Base técnica GEO completa: robots explícito + llms.txt + JSON-LD en 3 niveles (WebSite/Organization → LocalBusiness por ficha → Article por guía) + sitemap dinámico
- Pendiente MANUAL del dueño: dar de alta en Google Search Console + Bing Webmaster Tools (alimenta ChatGPT), verificar con HTML meta, enviar sitemap

---
Task ID: 8.16-legal
Agent: Super Z (principal)
Task: Revisión y actualización de Quiénes Somos, Privacidad y Términos

Work Log:
- Revisión completa de LegalPage.tsx (privacidad 12 secciones + términos 15) y AboutPage.tsx
- Privacidad: cookie age-verified 30 días (antes decía sessionStorage, falso desde Sprint 7B) en §5 y §6; añadido Cloudflare R2 en terceros (§4); añadidos datos de dueños (carta/fotos) y conteo agregado de clics en anuncios (§1)
- Términos: §2 añade carta digital, guías editoriales y espacios PUBLICIDAD; §6 añade derechos sobre imágenes subidas; §7 incluye carta en obligaciones del dueño
- Quiénes somos: 5 → 7 capas de valor (Carta Digital con Imagen Real + Guías Editoriales Semanales, iconos BookOpen/Newspaper); Directorio Exclusivo ahora menciona verificación/aprobación por el equipo
- Fecha legal: 23 ago → 17 sep 2026
- Commit b4f9a52, push, verificado en producción chunk ab8a2dc0a32133be.js (age-verified, siete capas, Cloudflare, Carta Digital, fecha, PUBLICIDAD todos presentes)

Stage Summary:
- Páginas legales al día con la realidad del producto (menú, anuncios, R2, cookie 30d)
- Sin cambios de identidad legal: sigue CONECTA-LT / Los Teques / sqn8nproyect@gmail.com / CeroTraba

---
Task ID: 8.17-security
Agent: Super Z (principal)
Task: Auditoría de ciberseguridad + remediación inmediata

Work Log:
- Auditoría completa: secrets, RBAC (42 rutas con requireRole), uploads presign (whitelist mime), auth v5 cookies secure/sameSite, Prisma anti-SQLi, XSS, rate limits, headers, dependencias (npm audit vía lockfile temporal)
- Hallazgo crítico: Next.js 16.1.3 con ~35 CVEs públicas (DoS, middleware bypass, cache poisoning, RCE específicas) → fix en 16.2.11+/16.3.3+
- Hallazgo alto: 5 rutas /api/diagnose-auth/* públicas (db-schema exponía enum/columnas; verificado HTTP 200 anónimo en producción)
- Ya preparado en local de sesión previa (auto-commits a4abb0a/7be30ec): guards requireRole('ADMIN') en las 5 rutas + SECURITY_HEADERS en next.config.ts (CSP frame-ancestors/object-src/base-uri, XFO DENY, nosniff, referrer strict-origin-when-cross-origin, permissions-policy, COOP same-origin-allow-popups)
- Upgrade Next.js + eslint-config-next a 16.3.5; build de producción local completo OK (todas las rutas prerenderizadas)
- Commit 0e83825, push, verificación en producción:
  - Las 6 cabeceras de seguridad presentes en conectalt.com
  - db-schema y last-auth-error ahora HTTP 401 sin sesión
  - Smoke test: /, /local, ficha, sitemap.xml, llms.txt → todos 200

Stage Summary:
- Paquete de seguridad LIVE: Next 16.3.5 + headers + diagnose-auth cerrado
- Pendiente del dueño: rotar NEXTAUTH_SECRET en Vercel + Redeploy; revocar PAT actual
- Fase 2 propuesta (no urgente): rate limit en escrituras públicas (reseñas/reservas), Zod en API, bun update de libs transitivas (lodash/nanoid/sharp), CSP completa con report-only

---
Task ID: 8.18-protocolo
Agent: Super Z (principal)
Task: Protocolo de cierre — guardar todo y revisar todo

Work Log:
- GIT: working tree limpio, push del worklog pendiente (f53a1f4) → main sincronizado, remote limpio
- PRODUCCIÓN revisada: 9 URLs clave 200 (home, local, editorial, guía, 2 fichas, sitemap, llms.txt, robots) · 3 APIs públicas 200 · X-Frame-Options DENY ✓ · CSP frame-ancestors ✓ · diagnose-auth 401 ✓
- SESSION_HANDOFF.md reescrito con estado 8.14→8.18, pendientes del dueño y gotchas nuevos (verificación por chunks/CSS, PG embebida muere entre tool calls, truco npm audit)
- Contenido legal/GEO ya verificado en chunks (6/6 strings) en sprints anteriores

Stage Summary:
- Sesión cerrada en verde: multitarjeta + fix botón + GEO (llms.txt/robots/JSON-LD) + legal actualizada + seguridad (Next 16.3.5, headers, diagnose-auth cerrado)
- Dueño informado de sus 4 pendientes: revocar PAT, rotar NEXTAUTH_SECRET, datos anunciantes, confirmar sitemap en Bing

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
