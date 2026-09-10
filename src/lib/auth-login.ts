'use client';

// ─────────────────────────────────────────────────────────────
// CONECTA-LT — Inicio de sesión (Sprint 7B)
//
// Lógica extraída del Navbar para que también la use el modal
// de login contextual (LoginPromptModal). Dos flujos según
// proveedor:
//
// GOOGLE (OAuth): en producción usamos redirect:true (default) —
//   signIn hace un form POST que termina en 302 redirect del
//   navegador a Google. Esto funciona mejor que redirect:false
//   (fetch) en NextAuth v4 + Next.js 16, donde el flujo fetch
//   falla con OAuthCallback error (probable issue de cookies/
//   state entre el POST inicial y el callback de Google).
//   En localhost usamos redirect:false porque el sandbox puede
//   tener issues cross-origin (localhost vs 127.0.0.1).
//
// DEMO (Credentials): abre un modal para que el usuario escriba
//   su email. Solo autentica usuarios ya existentes en la DB
//   (creados previamente vía Google OAuth). No crea usuarios
//   nuevos ni pisa name/image — Google es la única fuente de
//   verdad para identidad.
// ─────────────────────────────────────────────────────────────

import { signIn } from 'next-auth/react';

type Notify = (message: string, type?: 'success' | 'info') => void;

export function startLogin(notify: Notify) {
  void signIn('google', { callbackUrl: '/' }).catch(() => {
    notify('Error de conexión al iniciar sesión con Google.', 'info');
  });
}

export function startLoginDev(notify: Notify) {
  // Google en localhost/dev — flujo fetch (redirect:false)
  void signIn('google', { callbackUrl: '/', redirect: false })
    .then((res) => {
      if (res?.error) {
        notify('No se pudo iniciar sesión. Intenta de nuevo.', 'info');
      } else if (res?.url && res.url.includes('/api/auth/error')) {
        const errorMatch = res.url.match(/[?&]error=([^&]+)/);
        const errorCode = errorMatch ? decodeURIComponent(errorMatch[1]) : 'unknown';
        console.error('[auth] OAuth provider error:', errorCode, res.url);
        notify(
          `Error de autenticación con Google. Código: ${errorCode}. Revisa la configuración OAuth.`,
          'info',
        );
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.reload();
      }
    })
    .catch(() => {
      notify('Error de conexión al iniciar sesión. Intenta de nuevo.', 'info');
    });
}

/** true si estamos en producción (dominio real, no localhost/sandbox). */
export function isProductionHost(): boolean {
  return (
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    !window.location.hostname.startsWith('127.0.0.1')
  );
}

/**
 * Punto de entrada único: elige el flujo correcto según entorno.
 * En dev sin Google configurado (googleEnabled=false) devuelve
 * false para que el llamador abra el modal demo.
 */
export function beginLogin(
  googleEnabled: boolean,
  notify: Notify,
): boolean {
  if (googleEnabled) {
    if (isProductionHost()) {
      startLogin(notify);
    } else {
      startLoginDev(notify);
    }
    return true;
  }
  // Google no configurado → el llamador abre el modal demo.
  return false;
}
