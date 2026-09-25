# 🤝 SESSION HANDOFF — RAM del proyecto
> **Actualizar tras CADA tarea cerrada.** Máximo 40 líneas.
> Lo lee automáticamente `scripts/session-boot.sh` en cada arranque de sesión.
> Protocolo maestro: **PROTOCOL.md v2 (2026-09-12)** — jerarquía de verdad y reglas anti-alucinación.
> Historial: worklog.md (cola) + worklog-archivo-2026-09.md.

**Fecha inicio sesión:** 2026-09-12
**Última actividad:** 2026-09-25 — CHAT F0+F1 implementado en local (Task ID: chat-f0-f1-implementacion-2026-09-25): 5 tablas + API /api/chat/* + vista "Mensajes" con badge + E2E ana↔beto PASS. SIN PUSH.
**Chat:** continuación con resumen (contexto compactado) — ⚠️ los resúmenes NO son fuente de verdad: ver PROTOCOL.md §0–§1
**Idioma:** SIEMPRE español con el dueño — regla permanente §3.9 del PROTOCOL.md (pedido del dueño)

**Estado del workspace:** 🟢 Chat funcional punta a punta en local (polling; Pusher listo con env vars). Producción intacta (WhatsApp al día). Local AHEAD de origin con commits de chat + plan PDF.
- **8.18 whatsapp**: en producción (flotante + footer + about, tracking WHATSAPP_CLICK).
- **Chat F0+F1**: tablas+API+UI+E2E verificados en PG embebida; migración `20260925120000_chat` commiteada (corre en Neon solo al deployar).
- **Plan de chat** (PDF 17 págs) entregado en download/.

**Siguiente paso acordado:** dueño decide (1) Pusher sí/no (opcional: sin credenciales el chat anda por polling); (2) autorizar push a main (= deploy + migración en Neon); (3) retención de notas de voz (sugerido 90d). Pendiente de seguridad: rotar NEXTAUTH_SECRET.

**Pendientes del usuario (dueño):**
- CHAT→PROD: decidir Pusher (6 env vars en Vercel, opcionales) + aprobar push (main = deploy automático) + retención de voz
- Rotar NEXTAUTH_SECRET/AUTH_SECRET en Vercel + Redeploy (arrastrado desde 18-Ago)
- (Recomendado) Rotar contraseña Neon y llaves R2 — expuestas en PROTOCOL.md v1 del historial git
- REVOCAR PAT `ghp_FuRWb...` (ya no se necesita) y confirmar que `ghp_ixLT...` (17-sep) está revocado
- Datos: IG Africa Burguers · IG Licobar JJ (@puntoencuentrolt) · dirección real de Medusa

**Gotchas activos:**
- embedded-postgres beta.17: clase en `.default`, requerir `dist/index.js` exacto. Levantar PG: `bash scripts/preview-run.sh`
- `unset DATABASE_URL DIRECT_URL` antes de prisma CLI; `.env` local = PG embebida 5433 + DIRECT_URL + AUTH_SECRET dev-only (reconstruido 25-sep tras restore)
- El sandbox mata procesos background entre tool calls: PG + dev server + agent-browser SIEMPRE en la MISMA llamada
- agent-browser: `wait --text` NO matchea placeholders/aria-labels (usar find role + reintentos); modal demo tarda >10s en dev; find text ambiguo con títulos iguales → `find role button --name`; AgeGate: cookie `age-verified=1`
- `bun -e` falla con Prisma (engines) — usar `bun scripts/x.ts`
- `NEXT_PUBLIC_*` se hornean en build (Pusher cliente requiere Redeploy al cambiarlas)
- Restore de snapshot borra NO trackeados (`.env` perdido ×3) — RECOVERY.md paso 6; al restaurar: backup branch → reset a origin/main → rescatar worklog del backup
- Preview local: `bash scripts/preview-run.sh` · Auth.js v5: fix `iss` Google = `customFetch` en `src/lib/auth.ts` (NO reintroducir patch-openid-client)
- E2E chat: `bash scripts/preview-run.sh bash scripts/chat-e2e3.sh` (2 usuarios) y `chat-e2e-mobile.sh`; usuarios demo ana/beto@test.local
