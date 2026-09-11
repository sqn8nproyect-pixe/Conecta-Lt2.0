'use client';

// Botón "Reintentar acceso con Google" para la página /auth/error.
//
// Por qué cliente: disparar signIn('google') requiere el runtime de
// next-auth/react (abre el flujo OAuth fresco con CSRF+PKCE nuevos).
// Un simple <a href> a /api/auth/signin/google no sirve en v5 (esa ruta
// espera POST con csrfToken).

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function RetryGoogleButton() {
  const [cargando, setCargando] = useState(false);

  return (
    <button
      type="button"
      disabled={cargando}
      onClick={() => {
        setCargando(true);
        // redirectTo por defecto = la página actual (/auth/error); si el
        // login funciona, Auth.js manda al callbackUrl que en la práctica
        // termina en el inicio. Forzamos '/' para aterrizar limpio.
        void signIn('google', { redirectTo: '/' });
      }}
      className="w-full rounded-full bg-gradient-to-r from-[#e8b64c] to-[#d4972e] px-6 py-3 text-sm font-semibold text-[#1a1408] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
    >
      {cargando ? 'Abriendo Google…' : 'Reintentar acceso con Google'}
    </button>
  );
}
