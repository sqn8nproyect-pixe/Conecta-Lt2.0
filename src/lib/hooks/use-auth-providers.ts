'use client';

/**
 * useAuthProviders
 * ───────────────
 * Detecta en el cliente si el proveedor Google OAuth está habilitado
 * (i.e., si NEXT_PUBLIC_GOOGLE_CLIENT_ID está configurado).
 *
 * El Client ID de Google es público por definición (se envía al navegador
 * durante el flujo OAuth), por lo que exponerlo al cliente es seguro.
 *
 * El Navbar usa este hook para decidir qué botón mostrar:
 *   - Si googleEnabled === true  → "Continuar con Google"
 *   - Si googleEnabled === false → "Cuenta Demo"
 */
export function useAuthProviders() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleEnabled = Boolean(clientId && clientId.trim().length > 0);

  return { googleEnabled };
}
